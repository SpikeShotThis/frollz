/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { filmApi, emulsionApi, transitionApi } from '@/services/api-client';
import BaseModal from '@/components/BaseModal.vue';
import { currentStateName } from '@/types';
const route = useRoute();
const router = useRouter();
const films = ref([]);
const emulsions = ref([]);
const transitionProfiles = ref([]);
const isLoading = ref(false);
const showModal = ref(false);
const selectedStates = ref([]);
const activeFilters = ref([]);
const addFilter = (field, label, value) => {
    if (!value)
        return;
    if (!activeFilters.value.some(f => f.field === field && f.value === value)) {
        activeFilters.value.push({ field, label, value });
    }
};
const removeFilter = (index) => activeFilters.value.splice(index, 1);
const clearFilters = () => { activeFilters.value = []; };
const clearStateFilter = () => { selectedStates.value = []; };
const submitting = ref(false);
const error = ref('');
// State names come from transition graph; use a static list for the filter UI
const filmStateOptions = [
    'Added', 'Frozen', 'Refrigerated', 'Shelved', 'Loaded',
    'Finished', 'Sent For Development', 'Developed', 'Received',
];
const getStateName = (film) => currentStateName(film);
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
const emptyForm = () => ({
    name: '',
    emulsionId: '',
    expirationDate: '',
    transitionProfileId: '',
    isBulkFilm: false,
    parentId: '',
});
const form = ref(emptyForm());
const filteredFilms = computed(() => {
    const base = activeFilters.value.length === 0
        ? films.value
        : films.value.filter(film => activeFilters.value.every(f => {
            if (f.field === 'emulsionBrand')
                return (film.emulsion?.brand ?? '') === f.value;
            return false;
        }));
    return base;
});
const sortedEmulsions = computed(() => emulsions.value.slice().sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase())));
const bulkprofileId = computed(() => transitionProfiles.value.find(p => p.name === 'bulk')?.id ?? '');
const bulkFilms = computed(() => films.value.filter(f => f.transitionProfileId === bulkprofileId.value));
const onBulkFilmToggle = () => {
    if (form.value.isBulkFilm) {
        form.value.parentId = '';
        form.value.transitionProfileId = bulkprofileId.value;
    }
    else {
        const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? '';
        form.value.transitionProfileId = standardId;
    }
};
const onParentFilmChange = () => {
    if (form.value.parentId) {
        form.value.emulsionId = '';
    }
};
const closeModal = () => {
    showModal.value = false;
    form.value = emptyForm();
    error.value = '';
};
const handleSubmit = async () => {
    submitting.value = true;
    error.value = '';
    try {
        const payload = {
            name: form.value.name,
            transitionProfileId: form.value.transitionProfileId,
            ...(form.value.emulsionId ? { emulsionId: form.value.emulsionId } : {}),
            ...(form.value.expirationDate ? { expirationDate: form.value.expirationDate } : {}),
            ...(form.value.parentId ? { parentId: form.value.parentId } : {}),
        };
        const created = await filmApi.create(payload);
        closeModal();
        await router.push({ name: 'roll-detail', params: { key: created.data.id } });
    }
    catch {
        error.value = 'Failed to add film. Please try again.';
    }
    finally {
        submitting.value = false;
    }
};
const loadFilms = async () => {
    isLoading.value = true;
    try {
        const params = selectedStates.value.length > 0 ? { state: selectedStates.value } : undefined;
        const response = await filmApi.getAll(params);
        films.value = response.data;
    }
    catch (err) {
        console.error('Error loading films:', err);
    }
    finally {
        isLoading.value = false;
    }
};
const updateUrlQueryParams = () => {
    const query = { ...route.query };
    if (selectedStates.value.length > 0) {
        query.state = selectedStates.value;
    }
    else {
        delete query.state;
    }
    router.replace({ query });
};
watch(selectedStates, () => {
    loadFilms();
    updateUrlQueryParams();
}, { deep: true });
const openAddFilm = (emulsionId) => {
    if (emulsionId)
        form.value.emulsionId = emulsionId;
    // Default to standard profile
    const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? '';
    form.value.transitionProfileId = standardId;
    showModal.value = true;
};
onMounted(async () => {
    const stateParam = route.query.state;
    if (stateParam) {
        const states = Array.isArray(stateParam) ? stateParam : [stateParam];
        selectedStates.value = states.filter((s) => s !== null);
    }
    await Promise.all([
        loadFilms(),
        emulsionApi.getAll().then(r => { emulsions.value = r.data; }),
        transitionApi.getProfiles().then(r => { transitionProfiles.value = r.data; }),
    ]);
    const emulsionId = route.query.emulsionId;
    if (emulsionId)
        openAddFilm(emulsionId);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "text-3xl font-bold text-gray-900 dark:text-gray-100" },
});
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openAddFilm();
            // @ts-ignore
            [openAddFilm,];
        } },
    ...{ class: "bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium" },
});
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4" },
});
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" },
});
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-wrap gap-2" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
for (const [state] of __VLS_vFor((__VLS_ctx.filmStateOptions))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        key: (state),
        for: (`state-filter-${state}`),
        ...{ class: "inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors" },
        ...{ class: (__VLS_ctx.selectedStates.includes(state)
                ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 dark:border-primary-400 text-primary-800 dark:text-primary-200'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600') },
    });
    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        id: (`state-filter-${state}`),
        type: "checkbox",
        value: (state),
        ...{ class: "rounded text-primary-600 focus:ring-primary-500" },
    });
    (__VLS_ctx.selectedStates);
    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (state);
    // @ts-ignore
    [filmStateOptions, selectedStates, selectedStates,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mt-3 flex items-center gap-3" },
});
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
if (__VLS_ctx.selectedStates.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearStateFilter) },
        ...{ class: "text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:hover:text-gray-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['underline']} */ ;
}
if (__VLS_ctx.selectedStates.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm text-gray-600 dark:text-gray-400" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    (__VLS_ctx.filteredFilms.length);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[2rem]']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm text-gray-500 dark:text-gray-400 font-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
if (__VLS_ctx.activeFilters.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm text-gray-600 dark:text-gray-400 italic" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['italic']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "hidden md:inline" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "md:hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
}
else {
    for (const [filter, index] of __VLS_vFor((__VLS_ctx.activeFilters))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (index),
            ...{ class: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 font-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-primary-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:bg-primary-900']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-primary-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        (filter.label);
        (filter.value);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeFilters.length === 0))
                        return;
                    __VLS_ctx.removeFilter(index);
                    // @ts-ignore
                    [selectedStates, selectedStates, clearStateFilter, filteredFilms, activeFilters, activeFilters, removeFilter,];
                } },
            ...{ class: "ml-1 inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[44px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-primary-900']} */ ;
        /** @type {__VLS_StyleScopedClasses['dark:hover:text-primary-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearFilters) },
        ...{ class: "text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:hover:text-gray-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['underline']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "md:hidden space-y-3" },
    'aria-busy': (__VLS_ctx.isLoading),
    'aria-label': "Films list",
});
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
if (__VLS_ctx.filteredFilms.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-center py-8 text-gray-600 dark:text-gray-400 italic" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['italic']} */ ;
}
for (const [film] of __VLS_vFor((__VLS_ctx.filteredFilms))) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        key: (film.id),
        to: ({ name: 'roll-detail', params: { key: film.id } }),
        ...{ class: "block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow" },
    }));
    const __VLS_2 = __VLS_1({
        key: (film.id),
        to: ({ name: 'roll-detail', params: { key: film.id } }),
        ...{ class: "block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:shadow-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-shadow']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-between items-start gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "min-w-0" },
    });
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-semibold text-primary-600 dark:text-primary-400 truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (film.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    (film.emulsion?.brand ?? '—');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "shrink-0 px-2 text-xs leading-5 font-semibold rounded-full" },
        ...{ class: (__VLS_ctx.getStateColor(__VLS_ctx.getStateName(film))) },
    });
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    (__VLS_ctx.getStateName(film) || 'No state');
    // @ts-ignore
    [filteredFilms, filteredFilms, clearFilters, isLoading, getStateColor, getStateName, getStateName,];
    var __VLS_3;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md" },
    'aria-busy': (__VLS_ctx.isLoading),
    'aria-label': "Films table",
});
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:block']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "overflow-x-auto" },
});
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
    ...{ class: "min-w-full" },
});
/** @type {__VLS_StyleScopedClasses['min-w-full']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({
    ...{ class: "bg-gray-50 dark:bg-gray-700" },
});
/** @type {__VLS_StyleScopedClasses['bg-gray-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none" },
});
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['select-none']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none" },
});
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['select-none']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none" },
});
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['select-none']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "px-6 py-3" },
});
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({
    ...{ class: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" },
});
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-800']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-gray-700']} */ ;
for (const [film] of __VLS_vFor((__VLS_ctx.filteredFilms))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (film.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$router.push({ name: 'roll-detail', params: { key: film.id } });
                // @ts-ignore
                [filteredFilms, isLoading, $router,];
            } },
        ...{ class: "px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline" },
    });
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
    (film.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ onClick: (...[$event]) => {
                film.emulsion?.brand && __VLS_ctx.addFilter('emulsionBrand', 'Emulsion', film.emulsion.brand);
                // @ts-ignore
                [addFilter,];
            } },
        ...{ class: "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400" },
    });
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:hover:text-primary-400']} */ ;
    (film.emulsion?.brand ?? '—');
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "px-6 py-4 whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "px-2 inline-flex text-xs leading-5 font-semibold rounded-full" },
        ...{ class: (__VLS_ctx.getStateColor(__VLS_ctx.getStateName(film))) },
    });
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    (__VLS_ctx.getStateName(film) || 'No state');
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "px-6 py-4 whitespace-nowrap text-right" },
    });
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$router.push({ name: 'roll-detail', params: { key: film.id } });
                // @ts-ignore
                [getStateColor, getStateName, getStateName, $router,];
            } },
        ...{ class: "px-3 py-2 min-h-[44px] text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30" },
    });
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-[44px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-primary-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-primary-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:border-primary-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
    // @ts-ignore
    [];
}
const __VLS_6 = BaseModal || BaseModal;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    ...{ 'onClose': {} },
    open: (__VLS_ctx.showModal),
    titleId: "add-film-title",
}));
const __VLS_8 = __VLS_7({
    ...{ 'onClose': {} },
    open: (__VLS_ctx.showModal),
    titleId: "add-film-title",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_11;
const __VLS_12 = ({ close: {} },
    { onClose: (__VLS_ctx.closeModal) });
const { default: __VLS_13 } = __VLS_9.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    id: "add-film-title",
    ...{ class: "text-xl font-bold text-gray-900 dark:text-gray-100 mb-4" },
});
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.handleSubmit) },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-4" },
});
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "film-name",
    ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300" },
});
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-red-500" },
    'aria-hidden': "true",
});
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    id: "film-name",
    value: (__VLS_ctx.form.name),
    type: "text",
    required: true,
    'aria-required': "true",
    placeholder: "e.g. Roll 001",
    ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" },
});
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-gray-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center gap-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "film-bulk-canister",
    ...{ class: "flex items-center gap-2 cursor-pointer" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.onBulkFilmToggle) },
    id: "film-bulk-canister",
    type: "checkbox",
    ...{ class: "rounded" },
});
(__VLS_ctx.form.isBulkFilm);
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm font-medium text-gray-700 dark:text-gray-300" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-xs text-gray-600 dark:text-gray-400" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
if (!__VLS_ctx.form.isBulkFilm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        for: "film-parent",
        ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300" },
    });
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.onParentFilmChange) },
        id: "film-parent",
        value: (__VLS_ctx.form.parentId),
        ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
    });
    for (const [film] of __VLS_vFor((__VLS_ctx.bulkFilms))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (film.id),
            value: (film.id),
        });
        (film.name);
        (film.emulsion?.brand ?? 'Unknown emulsion');
        // @ts-ignore
        [showModal, closeModal, handleSubmit, form, form, form, form, onBulkFilmToggle, onParentFilmChange, bulkFilms,];
    }
}
if (!__VLS_ctx.form.parentId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        for: "film-emulsion",
        ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300" },
    });
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-red-500" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        id: "film-emulsion",
        value: (__VLS_ctx.form.emulsionId),
        required: (!__VLS_ctx.form.parentId),
        'aria-required': "true",
        ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
        disabled: true,
    });
    for (const [emulsion] of __VLS_vFor((__VLS_ctx.sortedEmulsions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (emulsion.id),
            value: (emulsion.id),
        });
        (emulsion.brand);
        (emulsion.manufacturer);
        (emulsion.speed);
        // @ts-ignore
        [form, form, form, sortedEmulsions,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-gray-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gray-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:bg-gray-700/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "film-expiration-date",
    ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300" },
});
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    id: "film-expiration-date",
    type: "date",
    ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
});
(__VLS_ctx.form.expirationDate);
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "film-profile",
    ...{ class: "block text-sm font-medium text-gray-700 dark:text-gray-300" },
});
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-red-500" },
    'aria-hidden': "true",
});
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    id: "film-profile",
    value: (__VLS_ctx.form.transitionProfileId),
    required: true,
    'aria-required': "true",
    ...{ class: "mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" },
});
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-100']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
    disabled: true,
});
for (const [profile] of __VLS_vFor((__VLS_ctx.transitionProfiles))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (profile.id),
        value: (profile.id),
    });
    (profile.name);
    // @ts-ignore
    [form, form, transitionProfiles,];
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        role: "alert",
        ...{ class: "mt-4 text-sm text-red-600 dark:text-red-400" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex justify-end gap-3 mt-6" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.closeModal) },
    type: "button",
    ...{ class: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" },
});
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-gray-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-gray-700']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    type: "submit",
    disabled: (__VLS_ctx.submitting),
    ...{ class: "px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50" },
});
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
(__VLS_ctx.submitting ? 'Adding...' : 'Add Film');
// @ts-ignore
[closeModal, error, error, submitting, submitting,];
var __VLS_9;
var __VLS_10;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
