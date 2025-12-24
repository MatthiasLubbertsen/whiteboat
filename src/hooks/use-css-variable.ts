import { useState, useEffect } from 'react';

export function useCssVariable(variableName: string) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const updateValue = () => {
      const val = getComputedStyle(document.body).getPropertyValue(variableName).trim();
      setValue(val);
    };

    updateValue();

    const observer = new MutationObserver(updateValue);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => observer.disconnect();
  }, [variableName]);

  return value;
}
