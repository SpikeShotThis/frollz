const STATE_COLORS: Record<string, string> = {
  Imported: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  Added:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  Frozen: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  Refrigerated:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  Shelved: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  Loaded:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  Finished:
    "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  "Sent For Development":
    "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  Developed:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  Received:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
};

const DEFAULT_COLOR =
  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

export const getStateColor = (state: string): string =>
  STATE_COLORS[state] ?? DEFAULT_COLOR;

const STATE_BORDER_COLORS: Record<string, string> = {
  Imported: "border-teal-400 dark:border-teal-500",
  Added: "border-orange-400 dark:border-orange-500",
  Frozen: "border-blue-400 dark:border-blue-500",
  Refrigerated: "border-cyan-400 dark:border-cyan-500",
  Shelved: "border-gray-400 dark:border-gray-500",
  Loaded: "border-yellow-400 dark:border-yellow-500",
  Finished: "border-green-400 dark:border-green-500",
  "Sent For Development": "border-orange-400 dark:border-orange-500",
  Developed: "border-purple-400 dark:border-purple-500",
  Received: "border-indigo-400 dark:border-indigo-500",
};

const DEFAULT_BORDER_COLOR = "border-gray-400 dark:border-gray-500";

export const getStateBorderColor = (state: string): string =>
  STATE_BORDER_COLORS[state] ?? DEFAULT_BORDER_COLOR;
