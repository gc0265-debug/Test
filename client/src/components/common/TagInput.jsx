import { useState } from 'react';

export function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');

  function addTag(raw) {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {value.map(tag => (
        <span key={tag} className="tag">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))}>✕</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && addTag(input)}
        placeholder={value.length ? '' : 'Aggiungi tag...'}
      />
    </div>
  );
}
