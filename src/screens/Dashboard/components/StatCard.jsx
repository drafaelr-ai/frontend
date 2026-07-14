import React, { useState } from 'react';

const StatCard = ({ label, value, icon, trend, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const isClickable = !!onClick;

    const handleClick = () => {
        if (onClick) onClick();
    };

    return (
        <div
            style={{
                background: hovered && isClickable ? 'var(--surface-page)' : 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '18px',
                padding: '14px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9px',
                    background: 'color-mix(in srgb, var(--module-obras) 12%, var(--surface-card))',
                    color: 'var(--module-obras)',
                    fontSize: 'var(--text-base)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    flexShrink: 0,
                }}>
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
                fontSize: '24px',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--text-primary)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: trend ? '6px' : 0,
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

export default StatCard;
