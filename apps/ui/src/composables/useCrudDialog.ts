import { ref } from 'vue';

export function useCrudDialog() {
  const isDialogOpen = ref(false);
  const isSaving = ref(false);
  const archiveTarget = ref<{ id: number; name: string } | null>(null);

  function openForCreate(reset: () => void): void {
    reset();
    isDialogOpen.value = true;
  }

  function openForEdit(populate: () => void): void {
    populate();
    isDialogOpen.value = true;
  }

  function closeDialog(): void {
    isDialogOpen.value = false;
  }

  function beginArchive(id: number, name: string): void {
    archiveTarget.value = { id, name };
  }

  function cancelArchive(): void {
    archiveTarget.value = null;
  }

  return {
    isDialogOpen,
    isSaving,
    archiveTarget,
    openForCreate,
    openForEdit,
    closeDialog,
    beginArchive,
    cancelArchive,
  };
}
