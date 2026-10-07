import React, { useEffect, useState } from 'react';
import { FiUser } from 'react-icons/fi';
import './OfficerAvatar.css';

/**
 * Officer photo with a consistent placeholder.
 * Used by both the admin manager and the public "Meet the Officers" grid so the
 * no-photo state can never drift between the two again.
 */
const OfficerAvatar = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;

  if (showImage) {
    return <img src={src} alt={alt} onError={() => setFailed(true)} />;
  }

  return (
    <div className="officer-image-fallback" role="img" aria-label={`${alt || 'Officer'}, no photo available`}>
      <FiUser />
    </div>
  );
};

export default OfficerAvatar;
