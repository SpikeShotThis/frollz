const STATE_COLORS: Record<string, string> = {
  Imported: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  Added: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  Refrigerated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  Shelved: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  Loaded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  Finished: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  'Sent For Development': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  Developed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  Received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

export const getStateColor = (state: string): string => STATE_COLORS[state] ?? DEFAULT_COLOR
