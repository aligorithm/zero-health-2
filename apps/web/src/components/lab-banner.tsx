'use client';

import { useEffect, useState } from 'react';

const KEY = 'zh_banner_dismissed';

export function LabBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(KEY) === '1') setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="lab-banner" role="region" aria-label="Lab notice">
      ⚠ <b>Zero Health Lab</b> · intentionally vulnerable · do not deploy publicly
      <button
        className="banner-dismiss"
        aria-label="Dismiss notice"
        title="Dismiss notice"
        onClick={() => {
          window.localStorage.setItem(KEY, '1');
          setShow(false);
        }}
      >
        ✕
      </button>
    </div>
  );
}
