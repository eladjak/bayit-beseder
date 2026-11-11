import { isNewUiBuild, overrideAllowed, UI_OVERRIDE_KEY } from "@/lib/ui-flag";

/** Mount in the document head before paint when the root layout is ready. */
export function UiFlagScript() {
  const build = isNewUiBuild();
  const allow = overrideAllowed();
  if (!build && !allow) return null;

  const script = `(function(){
  var enabled = ${JSON.stringify(build)};
  if (${JSON.stringify(allow)}) {
    try {
      var query = new URLSearchParams(window.location.search).get('ui');
      if (query === 'v2') localStorage.setItem(${JSON.stringify(UI_OVERRIDE_KEY)}, 'v2');
      if (query === 'v1') localStorage.removeItem(${JSON.stringify(UI_OVERRIDE_KEY)});
      enabled = enabled || query === 'v2' || (query !== 'v1' && localStorage.getItem(${JSON.stringify(UI_OVERRIDE_KEY)}) === 'v2');
    } catch (e) {}
  }
  if (enabled) document.documentElement.dataset.ui = 'v2';
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
