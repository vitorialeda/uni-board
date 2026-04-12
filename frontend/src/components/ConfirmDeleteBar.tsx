type ConfirmDeleteBarProps = {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmDeleteBar = ({ message, onCancel, onConfirm }: ConfirmDeleteBarProps) => (
  <div className="confirm-delete-bar">
    <p>{message}</p>
    <div className="confirm-delete-bar-actions">
      <button type="button" className="btn-secondary btn-secondary--cancel" onClick={onCancel}>
        Cancelar
      </button>
      <button type="button" className="btn-danger" onClick={onConfirm}>
        Excluir
      </button>
    </div>
  </div>
);

export default ConfirmDeleteBar;
