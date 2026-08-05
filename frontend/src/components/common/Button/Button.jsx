import { Link } from 'react-router-dom';

import Icon from '../Icon/Icon.jsx';
import './Button.css';

/** The site's one button. */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  to,
  href,
  className = '',
  ...rest
}) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim();

  const content = (
    <>
      <span className="btn__label">{children}</span>
      {icon && (
        <span className="btn__icon">
          <Icon name={icon} size={size === 'lg' ? 19 : 17} />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link className={classes} to={to} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type="button" {...rest}>
      {content}
    </button>
  );
}
