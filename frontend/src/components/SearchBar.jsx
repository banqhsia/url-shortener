import { useState, useEffect, useRef } from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search by code or URL…' }) {
  const [input, setInput] = useState(value);
  const timer = useRef(null);

  useEffect(() => { setInput(value); }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setInput(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  }

  return (
    <input
      className="search-input"
      type="text"
      value={input}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
