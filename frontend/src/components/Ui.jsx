export const Avatar=({name})=><span className="avatar">{name?.[0]?.toUpperCase()}</span>;
export const Toggle=({checked,onChange,label})=><label className="toggle-row"><span>{label}</span><span className="toggle"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i/></span></label>;
export const Empty=({children})=><div className="empty">{children}</div>;
export const Modal=({title,onClose,children})=><div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose}>×</button></header>{children}</section></div>;
