import React, { useState } from 'react';

const StatCardCompact = ({ label, value, icon, trend, to, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const isClickable = !!(to || onClick);

    const handleClick = () => {
        if (onClick) return onClick();
        if (to) window.history.pushState({}, '', to);
    };

    return (
        <div
            style={{
                background: hovered && isClickable ? 'var(--surface-page)' : 'var(--surface-card)',
                border: '0.5px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 14px',
                boxShadow: 'var(--shadow-card)',
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'background var(--transition-fast)',
                userSelect: 'none',
            }}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? `${label}: ${value}` : undefined}
            onClick={isClickable ? handleClick : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    {icon}
                </span>
                <span style={{
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-wide)',
                    color: 'var(--text-secondary)',
                    fontWeight: 'var(--weight-medium)',
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
                marginBottom: trend ? '4px' : 0,
            }}>
                {value}
            </div>
            {trend && (
                <div style={{
                    fontSize: 'var(--text-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: trend.direction === 'up' ? 'var(--status-success-text)'
                         : trend.direction === 'down' ? 'var(--status-danger-text)'
                         : 'var(--text-muted)',
                }}>
                    {trend.direction === 'up' && <i className="ti ti-trending-up" aria-hidden="true" />}
                    {trend.direction === 'down' && <i className="ti ti-trending-down" aria-hidden="true" />}
                    {trend.value}
                </div>
            )}
        </div>
    );
};

export default StatCardCompact;
