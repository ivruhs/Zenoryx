// components/ui/Banner.tsx
export function Banner() {
  return (
    <div className="fixed top-0 z-50 w-full border-b border-yellow-300 bg-yellow-100 px-4 py-2 text-center text-sm text-yellow-900 shadow-md dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-100">
      ⚠️ Beta Mode: This app uses free-tier LLMs. For best results, avoid large
      GitHub repos. Some rate-limit errors may occur.
    </div>
  );
}
