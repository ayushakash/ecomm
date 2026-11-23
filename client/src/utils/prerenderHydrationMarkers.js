/**
 * Make react-snap HTML hydratable by React 18.
 *
 * react-snap saves the live DOM, not React server output, so two things that
 * React's server renderer always emits are missing — and each one makes
 * hydrateRoot throw away the whole prerendered page and render it again
 * (hydration errors #418/#423/#425, the large layout shift seen on every page):
 *   1. Suspense boundary markers. While hydrating, React expects every
 *      <Suspense> boundary to start with <!--$--> and end with <!--/$-->.
 *   2. Separators between adjacent text nodes. "Rs " + "330" are two DOM text
 *      nodes but one node once serialised; React SSR keeps them apart with <!-- -->.
 * Called from window.snapSaveState (index.js), i.e. only inside react-snap,
 * right before the page is serialised. Reads React's fiber tree (React 18
 * internals: fiber tags and the root container key).
 */
const HOST_PORTAL = 4;
const HOST_COMPONENT = 5;
const HOST_TEXT = 6;
const SUSPENSE = 13;

/** Outermost DOM nodes rendered inside `fiber` (portals excluded). */
const topLevelHostNodes = (fiber, out = []) => {
  for (let child = fiber.child; child; child = child.sibling) {
    if (child.tag === HOST_COMPONENT || child.tag === HOST_TEXT) out.push(child.stateNode);
    else if (child.tag !== HOST_PORTAL) topLevelHostNodes(child, out);
  }
  return out;
};

/** Suspense boundaries currently showing their content, outermost first. */
const resolvedSuspenseBoundaries = (fiber, out = []) => {
  for (let f = fiber; f; f = f.sibling) {
    if (f.tag === SUSPENSE && f.memoizedState === null) out.push(f);
    resolvedSuspenseBoundaries(f.child, out);
  }
  return out;
};

export function addHydrationMarkers(rootElement) {
  const containerKey = Object.keys(rootElement).find((k) => k.startsWith('__reactContainer$'));
  if (!containerKey) return;
  const hostRoot = rootElement[containerKey].stateNode.current;

  for (const boundary of resolvedSuspenseBoundaries(hostRoot.child)) {
    const nodes = topLevelHostNodes(boundary);
    if (!nodes.length) continue;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    first.parentNode.insertBefore(document.createComment('$'), first);
    last.parentNode.insertBefore(document.createComment('/$'), last.nextSibling);
  }

  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
  const adjacent = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nextSibling && node.nextSibling.nodeType === Node.TEXT_NODE) adjacent.push(node);
  }
  adjacent.forEach((node) => node.parentNode.insertBefore(document.createComment(' '), node.nextSibling));
}
