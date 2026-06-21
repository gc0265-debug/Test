import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Modal } from './Modal';
import { TagInput } from './TagInput';

const CATEGORIES = [
  { value: 'project', label: 'Project', endpoint: '/projects' },
  { value: 'area', label: 'Area', endpoint: '/areas' },
  { value: 'resource', label: 'Resource', endpoint: '/resources' },
];

export function QuickCapture({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('project');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handler(e) {
      if (e.key === 'c' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        setOpen(true);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const cat = CATEGORIES.find(c => c.value === category);
      await api.post(cat.endpoint, { title: title.trim(), tags });
      setTitle('');
      setTags([]);
      setOpen(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} title="Cattura rapida (C)">+</button>
      {open && (
        <Modal title="Cattura rapida" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="quick-form">
            <div className="category-pills">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`pill pill--${c.value} ${category === c.value ? 'pill--active' : ''}`}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              className="input"
              placeholder="Titolo..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <TagInput value={tags} onChange={setTags} />
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
