import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  isOpen: boolean;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, isOpen, children, onClose }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar" icon={<X size={18} />}>
            Cerrar
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
