import React from 'react';

const SEVERITY_CONFIG = {
    danger:  { icon: 'ti-alert-triangle', color: 'var(--status-danger)',  bg: 'var(--status-danger-bg)' },
    warning: { icon: 'ti-alert-circle',   color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
    info:    { icon: 'ti-info-circle',    color: 'var(--status-info)',    bg: 'var(--status-info-bg)' },
};

const AlertStatCard = ({ label, value, severity = 'info', description, onClick }) => {
    const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
    const isClickable = !!onClick;

    const handleClick = () => {
        if (onClick) onClick();
    };

    return (
        <div
            style={{
                background: cfg.bg,
                borderRadius: 'var(--radius-lg)',
                borderLeft: `3px solid ${cfg.color}`,
                border: `0.5px solid var(--border-subtle)`,
                borderLeftWidth: '3px',
                borderLeftColor: cfg.color,
                padding: '12px 14px',
                boxShadow: 'var(--shadow-card)',
                cursor: isClickable ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'opacity var(--transition-fast)',
            }}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? `${label}: ${value}` : undefined}
            onClick={isClickable ? handleClick : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <i className={`ti ${cfg.icon}`} style={{ fontSize: 'var(--text-sm)', color: cfg.color }} aria-hidden="true" />
                <span style={{
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-wide)',
                    color: cfg.color,
                    fontWeight: 'var(--weight-semibold)',
                }}>
                    {label}
                </span>
            </div>
            <div className="num" style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--text-primary)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: description ? '4px' : 0,
            }}>
                {value}
            </div>
            {description && (
                <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                }}>
                    {description}
                </div>
            )}
        </div>
    );
};

export default AlertStatCard;
