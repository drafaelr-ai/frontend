import React, { useState } from 'react';

const ActivityItem = ({ icon, title, description, timestamp, obraName, to, onClick, isLast }) => {
    const [hovered, setHovered] = useState(false);
    const isClickable = !!(to || onClick);

    const handleClick = () => {
        if (onClick) return onClick();
        if (to) window.history.pushState({}, '', to);
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 14px',
                borderBottom: isLast ? 'none' : '0.5px solid var(--surface-muted)',
                background: hovered && isClickable ? 'var(--surface-muted)' : 'transparent',
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'background var(--transition-fast)',
                userSelect: 'none',
            }}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? title : undefined}
            onClick={isClickable ? handleClick : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
        >
            <span style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
                marginTop: '1px',
            }} aria-hidden="true">
                {icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {title}
                </div>
                {description && (
                    <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginTop: '1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {description}
                    </div>
                )}
                {obraName && (
                    <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--status-info)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {obraName}
                    </div>
                )}
            </div>
            {timestamp && (
                <span style={{
                    flexShrink: 0,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                }}>
                    {timestamp}
                </span>
            )}
        </div>
    );
};

export default ActivityItem;
