import React from 'react';
import { formatCurrency } from '../../../utils/format';

const VARIANT_COLORS = {
    info:    'var(--module-obras)',
    success: 'var(--status-success)',
    warning: 'var(--status-warning)',
    danger:  'var(--status-danger)',
    default: 'var(--module-obras)',
};

function getBudgetVariant(pct) {
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warning';
    return 'default';
}

const ProgressBar = ({ current, total, showLabels = true, variant, height = 4 }) => {
    const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    const resolvedVariant = variant ?? getBudgetVariant(pct);
    const fillColor = VARIANT_COLORS[resolvedVariant] ?? VARIANT_COLORS.default;

    return (
        <div>
            {showLabels && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                }}>
                    <span>{formatCurrency(current)}</span>
                    <span>{pct.toFixed(0)}%</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            )}
            <div style={{
                height: `${height}px`,
                background: 'var(--surface-muted)',
                borderRadius: '9999px',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: fillColor,
                    borderRadius: '9999px',
                    transition: 'width var(--transition-fast)',
                }} />
            </div>
        </div>
    );
};

export default ProgressBar;
