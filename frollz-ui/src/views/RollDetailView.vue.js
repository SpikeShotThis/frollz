/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { filmApi, filmTagApi, tagApi, transitionApi } from '@/services/api-client';
import { currentStateName } from '@/types';
import { useNotificationStore } from '@/stores/notification';
const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();
const film = ref(null);
const parentFilm = ref(null);
const childFilms = ref([]);
const filmTags = ref([]);
const allTags = ref([]);
const transitionProfiles = ref([]);
const loading = ref(true);
const transitionError = ref('');
const transitionSubmitting = ref(false);
const pendingTransition = ref(null);
const transitionDate = ref('');
const transitionNote = ref('');
const transitionGraph = ref({ states: [], transitions: [] });
const stateName = computed(() => film.value ? currentStateName(film.value) : '');
const getChildStateName = (child) => currentStateName(child);
const isBulkFilm = computed(() => {
    const bulkProfile = transitionProfiles.value.find(p => p.name === 'bulk');
    return !!bulkProfile && film.value?.transitionprofileId === bulkProfile.id;
});
const isBackwardTransition = (from, to) => transitionGraph.value.transitions.some(t => t.fromState === from && t.toState === to) === false && !!from && !!to &&
    transitionGraph.value.transitions.some(t => t.toState === from && t.fromState === to);
const validTransitions = computed(() => film.value
    ? transitionGraph.value.transitions
        .filter(t => t.fromState === stateName.value)
        .map(t => t.toState)
    : []);
const tagById = computed(() => {
    const map = {};
    for (const t of allTags.value)
        map[t.id] = t;
    return map;
});
const availableTags = computed(() => {
    const assignedIds = new Set(filmTags.value.map(ft => ft.tagId));
    return allTags.value.filter(t => !assignedIds.has(t.id));
});
const sortedStates = computed(() => {
    if (!film.value?.states)
        return [];
    return [...film.value.states].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});
const getStateColor = (state) => {
    const colors = {
        Added: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
        Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        Refrigerated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
        Shelved: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        Loaded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
        Finished: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
        'Sent For Development': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
        Developed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
        Received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
    };
    return colors[state] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};
const formatDate = (date) => new Date(date).toLocaleDateString();
const handleTransition = (targetState) => {
    pendingTransition.value = targetState;
    transitionDate.value = new Date().toISOString().slice(0, 10);
    transitionNote.value = '';
};
const confirmTransition = async () => {
    if (!film.value || !pendingTransition.value)
        return;
    transitionSubmitting.value = true;
    transitionError.value = '';
    try {
        const dateStr = transitionDate.value
            ? new Date(transitionDate.value + 'T12:00:00').toISOString()
            : undefined;
        await filmApi.transition(film.value.id, pendingTransition.value, dateStr, transitionNote.value || undefined);
        pendingTransition.value = null;
        transitionNote.value = '';
        await loadData();
        notification.announce(`Film moved to ${pendingTransition.value ?? ''}`);
    }
    catch {
        transitionError.value = 'Failed to transition film. Please try again.';
    }
    finally {
        transitionSubmitting.value = false;
    }
};
const addTag = async (tag) => {
    if (!film.value)
        return;
    try {
        await filmTagApi.create({ filmId: film.value.id, tagId: tag.id });
        await loadFilmTags();
    }
    catch (err) {
        console.error('Error adding tag:', err);
    }
};
const removeTag = async (filmTagId) => {
    try {
        await filmTagApi.delete(filmTagId);
        await loadFilmTags();
    }
    catch (err) {
        console.error('Error removing tag:', err);
    }
};
const loadFilmTags = async () => {
    if (!film.value)
        return;
    const response = await filmTagApi.getAll({ filmId: film.value.id });
    filmTags.value = response.data;
};
const loadData = async () => {
    const id = route.params.key;
    const [filmRes, tagsRes] = await Promise.all([
        filmApi.getById(id),
        tagApi.getAll(),
    ]);
    film.value = filmRes.data;
    allTags.value = tagsRes.data;
    await Promise.all([
        loadFilmTags(),
        film.value?.parentId
            ? filmApi.getById(film.value.parentId).then(r => { parentFilm.value = r.data; })
            : Promise.resolve().then(() => { parentFilm.value = null; }),
        isBulkFilm.value
            ? filmApi.getChildren(id).then(r => { childFilms.value = r.data; })
            : Promise.resolve().then(() => { childFilms.value = []; }),
    ]);
};
const reload = async () => {
    loading.value = true;
    try {
        await Promise.all([
            loadData(),
            transitionApi.getProfiles().then(r => { transitionProfiles.value = r.data; }),
        ]);
        const profileName = transitionProfiles.value.find(p => p.id === film.value?.transitionprofileId)?.name ?? 'standard';
        const graphRes = await transitionApi.getGraph(profileName);
        transitionGraph.value = graphRes.data;
    }
    finally {
        loading.value = false;
    }
};
onMounted(reload);
watch(() => route.params.key, reload);
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-6" },
});
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$router.push({ name: 'rolls' });
            // @ts-ignore
            [$router,];
        } },
    ...{ class: "inline-flex items-center min-h-[44px] text-sm text-primary-600 dark:text-primary-400 hover:underline" },
});
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        role: "status",
        'aria-label': "Loading film detail",
        ...{ class: "text-center py-12 text-gray-600 dark:text-gray-400" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-12']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
}
else if (!__VLS_ctx.film) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center py-12 text-gray-600 dark:text-gray-400" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-12']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-1 md:grid-cols-2 gap-6" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-6" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "text-3xl font-bold text-gray-900 dark:text-gray-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
    (__VLS_ctx.film.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mt-2 inline-block px-2 text-xs leading-5 font-semibold rounded-full" },
        ...{ class: (__VLS_ctx.getStateColor(__VLS_ctx.stateName)) },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    (__VLS_ctx.stateName || 'No state');
    if (__VLS_ctx.parentFilm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm text-gray-500 dark:text-gray-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.film))
                        return;
                    if (!(__VLS_ctx.parentFilm))
                        return;
                    __VLS_ctx.router.push({ name: 'roll-detail', params: { key: __VLS_ctx.parentFilm.id } });
                    // @ts-ignore
                    [loading, film, film, getStateColor, stateName, stateName, parentFilm, parentFilm, router,];
                } },
            ...{ class: "inline-flex items-center min-h-[44px] px-1 text-primary-600 dark:text-primary-400 hover:underline font-medium ml-1" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (__VLS_ctx.parentFilm.name);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.dl, __VLS_intrinsics.dl)({
        ...{ class: "space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    if (__VLS_ctx.film.emulsion) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({
            ...{ class: "text-gray-500 dark:text-gray-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
            ...{ class: "text-gray-900 dark:text-gray-100" },
        });
        /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
        (__VLS_ctx.film.emulsion.brand);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-gray-500 dark:text-gray-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        (__VLS_ctx.film.emulsion.speed);
    }
    if (__VLS_ctx.film.expirationDate) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({
            ...{ class: "text-gray-500 dark:text-gray-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({
            ...{ class: "text-gray-900 dark:text-gray-100" },
        });
        /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
        (__VLS_ctx.formatDate(__VLS_ctx.film.expirationDate));
    }
    if (__VLS_ctx.validTransitions.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-3" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col sm:flex-row sm:flex-wrap gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        for (const [targetState] of __VLS_vFor((__VLS_ctx.validTransitions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.film))
                            return;
                        if (!(__VLS_ctx.validTransitions.length > 0))
                            return;
                        __VLS_ctx.handleTransition(targetState);
                        // @ts-ignore
                        [film, film, film, film, film, parentFilm, formatDate, validTransitions, validTransitions, handleTransition,];
                    } },
                key: (targetState),
                disabled: (__VLS_ctx.transitionSubmitting),
                ...{ class: "w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium border rounded disabled:opacity-50" },
                ...{ class: (__VLS_ctx.isBackwardTransition(__VLS_ctx.stateName, targetState)
                        ? 'text-orange-700 border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-500 dark:hover:bg-orange-900/30'
                        : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:border-primary-700 dark:hover:bg-primary-800') },
            });
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
            /** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
            (__VLS_ctx.isBackwardTransition(__VLS_ctx.stateName, targetState) ? '↩ ' : '');
            (targetState);
            // @ts-ignore
            [stateName, stateName, transitionSubmitting, isBackwardTransition, isBackwardTransition,];
        }
        if (__VLS_ctx.pendingTransition) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-blue-300 dark:border-blue-600 rounded-md p-3 bg-blue-50 dark:bg-blue-900/20" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-blue-300']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:border-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:bg-blue-900/20']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm font-medium text-blue-800 dark:text-blue-200 mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-blue-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            (__VLS_ctx.pendingTransition);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                for: "transition-date",
                ...{ class: "block text-xs text-gray-600 dark:text-gray-400 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                id: "transition-date",
                type: "date",
                ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
            });
            (__VLS_ctx.transitionDate);
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                for: "transition-note",
                ...{ class: "block text-xs text-gray-600 dark:text-gray-400 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                id: "transition-note",
                value: (__VLS_ctx.transitionNote),
                rows: "2",
                ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col sm:flex-row gap-2 mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.confirmTransition) },
                disabled: (__VLS_ctx.transitionSubmitting),
                ...{ class: "w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50" },
            });
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-primary-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.film))
                            return;
                        if (!(__VLS_ctx.validTransitions.length > 0))
                            return;
                        if (!(__VLS_ctx.pendingTransition))
                            return;
                        __VLS_ctx.pendingTransition = null;
                        // @ts-ignore
                        [transitionSubmitting, pendingTransition, pendingTransition, pendingTransition, transitionDate, transitionNote, confirmTransition,];
                    } },
                disabled: (__VLS_ctx.transitionSubmitting),
                ...{ class: "w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50" },
            });
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
            /** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
        }
        if (__VLS_ctx.transitionError) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                role: "alert",
                ...{ class: "text-sm text-red-600 dark:text-red-400" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
            (__VLS_ctx.transitionError);
        }
    }
    if (__VLS_ctx.isBulkFilm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between items-center mb-4" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs text-gray-600 dark:text-gray-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        (__VLS_ctx.childFilms.length);
        (__VLS_ctx.childFilms.length !== 1 ? 's' : '');
        if (__VLS_ctx.childFilms.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-sm text-gray-600 dark:text-gray-400 italic" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['italic']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                ...{ class: "space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            for (const [child] of __VLS_vFor((__VLS_ctx.childFilms))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                    key: (child.id),
                    ...{ class: "flex items-center justify-between text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!!(!__VLS_ctx.film))
                                return;
                            if (!(__VLS_ctx.isBulkFilm))
                                return;
                            if (!!(__VLS_ctx.childFilms.length === 0))
                                return;
                            __VLS_ctx.router.push({ name: 'roll-detail', params: { key: child.id } });
                            // @ts-ignore
                            [router, transitionSubmitting, transitionError, transitionError, isBulkFilm, childFilms, childFilms, childFilms, childFilms,];
                        } },
                    ...{ class: "inline-flex items-center min-h-[44px] px-1 text-primary-600 dark:text-primary-400 hover:underline font-medium" },
                });
                /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                (child.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "px-2 text-xs leading-5 font-semibold rounded-full" },
                    ...{ class: (__VLS_ctx.getStateColor(__VLS_ctx.getChildStateName(child))) },
                });
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                (__VLS_ctx.getChildStateName(child) || 'No state');
                // @ts-ignore
                [getStateColor, getChildStateName, getChildStateName,];
            }
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap gap-2 mb-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    for (const [ft] of __VLS_vFor((__VLS_ctx.filmTags))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (ft.id),
            ...{ class: "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white" },
            ...{ style: ({ backgroundColor: __VLS_ctx.tagById[ft.tagId]?.colorCode ?? '#888' }) },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
        (__VLS_ctx.tagById[ft.tagId]?.name ?? '…');
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.film))
                        return;
                    __VLS_ctx.removeTag(ft.id);
                    // @ts-ignore
                    [filmTags, tagById, tagById, removeTag,];
                } },
            ...{ class: "ml-1 inline-flex items-center justify-center min-h-[44px] min-w-[44px] hover:opacity-70 font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:opacity-70']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        // @ts-ignore
        [];
    }
    if (__VLS_ctx.filmTags.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-sm text-gray-600 dark:text-gray-400 italic" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['italic']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-wrap gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [tag] of __VLS_vFor((__VLS_ctx.availableTags))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.film))
                        return;
                    __VLS_ctx.addTag(tag);
                    // @ts-ignore
                    [filmTags, availableTags, addTag,];
                } },
            key: (tag.id),
            type: "button",
            ...{ class: "px-3 py-2 min-h-[44px] rounded text-xs font-medium text-white opacity-40 hover:opacity-100 transition-opacity" },
            ...{ style: ({ backgroundColor: tag.colorCode }) },
        });
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-40']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:opacity-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-opacity']} */ ;
        (tag.name);
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-gray-500 dark:text-gray-400 mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-fit']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    if (__VLS_ctx.sortedStates.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-sm text-gray-600 dark:text-gray-400 py-4 text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.ol, __VLS_intrinsics.ol)({
            ...{ class: "relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-l']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:border-gray-700']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
        for (const [entry, idx] of __VLS_vFor((__VLS_ctx.sortedStates))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (entry.id),
                ...{ class: "ml-4" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800" },
                ...{ class: (idx === __VLS_ctx.sortedStates.length - 1 ? 'bg-gray-400' : __VLS_ctx.isBackwardTransition(__VLS_ctx.sortedStates[idx + 1]?.state?.name ?? '', entry.state?.name ?? '') ? 'bg-orange-400' : 'bg-primary-500') },
            });
            /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
            /** @type {__VLS_StyleScopedClasses['-left-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:border-gray-800']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center gap-2 flex-wrap" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "px-2 text-xs leading-5 font-semibold rounded-full" },
                ...{ class: (__VLS_ctx.getStateColor(entry.state?.name ?? '')) },
            });
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            (entry.state?.name ?? entry.stateId);
            if (idx === __VLS_ctx.sortedStates.length - 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-xs text-gray-600 dark:text-gray-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.time, __VLS_intrinsics.time)({
                ...{ class: "text-xs text-gray-600 dark:text-gray-400" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
            (__VLS_ctx.formatDate(entry.date));
            if (entry.note) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "mt-1 text-sm text-gray-600 dark:text-gray-400" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
                (entry.note);
            }
            // @ts-ignore
            [getStateColor, formatDate, isBackwardTransition, sortedStates, sortedStates, sortedStates, sortedStates, sortedStates,];
        }
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
