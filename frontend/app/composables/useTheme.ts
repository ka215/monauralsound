export function useTheme() {
  function toggle() {
    const dark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('ka2:theme', dark ? 'dark' : 'light')
    }
    catch {
      // ストレージ不可の環境では保存せず、そのセッションのみ反映する
    }
  }
  return { toggle }
}
