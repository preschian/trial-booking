import { switchParentAction } from "@/app/actions";

type ParentOption = { id: number; name: string };

export function ParentSwitcher({
  parents,
  currentParentId,
}: {
  parents: ParentOption[];
  currentParentId: number | null;
}) {
  return (
    <form action={switchParentAction} className="parent-switcher">
      <label>
        <span>Viewing as</span>
        <select
          name="parentId"
          defaultValue={currentParentId ?? ""}
        >
          <option value="" disabled>
            Choose a parent
          </option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button-quiet">
        Switch
      </button>
    </form>
  );
}
