import { ChevronDown } from "lucide-react";
import { useEditor } from "./EditorContext";
import Popover from "./Popover";

export default function HeaderAuth() {
  const { editor, checked, openLogin, signOut, signOutEverywhere } = useEditor();
  if (!checked) return null;
  if (!editor) return <button type="button" className="btn" onClick={openLogin}>Editor login</button>;

  return (
    <Popover role="menu" align="end" buttonClassName="btn" label={<>Editor mode <ChevronDown size={16} aria-hidden="true" /></>}>
      {(close) => (
        <div className="flex flex-col" style={{ minWidth: 200 }}>
          <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); void signOut(); }}>Sign out</button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); void signOutEverywhere(); }}>Sign out everywhere</button>
        </div>
      )}
    </Popover>
  );
}
