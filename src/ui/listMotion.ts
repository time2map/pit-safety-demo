/**
 * TransitionGroup before-leave hook for the signal lists: a leaving row turns position absolute
 * (.signal-list-leave-active in styles/app.css), which without a top would jump to the top of the list
 * and slide over the first row. Pin it where it is, so it just fades out in place.
 */
export function pinLeaving(el: Element) {
  const row = el as HTMLElement
  row.style.top = `${row.offsetTop}px`
}
