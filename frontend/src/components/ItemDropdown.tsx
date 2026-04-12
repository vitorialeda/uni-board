type ItemDropdownProps = {
  id: string;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
};

const ItemDropdown = ({
  id,
  openDropdownId,
  setOpenDropdownId,
  onEdit,
  onDelete,
}: ItemDropdownProps) => {
  const isOpen = openDropdownId === id;
  return (
    <div className="item-dropdown">
      <button
        type="button"
        className="item-dropdown-trigger"
        aria-expanded={isOpen}
        onClick={() => setOpenDropdownId(isOpen ? null : id)}
      >
        ⋮
      </button>
      {isOpen && (
        <>
          <div className="item-dropdown-backdrop" onClick={() => setOpenDropdownId(null)} />
          <div className="item-dropdown-menu">
            <button
              type="button"
              className="item-dropdown-option"
              onClick={() => { setOpenDropdownId(null); onEdit(); }}
            >
              Editar
            </button>
            <button
              type="button"
              className="item-dropdown-option item-dropdown-option--danger"
              onClick={() => { setOpenDropdownId(null); onDelete(); }}
            >
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemDropdown;
