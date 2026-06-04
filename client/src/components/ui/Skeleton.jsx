const Skeleton = ({ variant = 'text', className = '', ...props }) => {
  const variants = {
    text: 'skeleton-text',
    title: 'skeleton-title',
    card: 'skeleton-card',
    row: 'skeleton-row',
    avatar: 'skeleton-avatar',
  };

  return (
    <div
      className={`skeleton ${variants[variant] || variants.text} ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Skeleton;
