/**
 * Fortify Efficiency Formula Logic
 * 
 * Based on business requirements:
 * Efficiency Score = (Service Coverage x 30%) + (Cost Optimization x 25%) + 
 *                   (Contract Utilization x 20%) + (Risk Management x 15%)
 * 
 * This utility calculates the "Value Delta" between enrollment trends and contract costs.
 */

export interface EfficiencyMetrics {
    enrollmentCurrent: number;
    enrollmentPrevious: number;
    totalSpend: number;
}

export function calculateValueDelta(metrics: EfficiencyMetrics) {
    const enrollmentChange = (metrics.enrollmentCurrent - metrics.enrollmentPrevious) / metrics.enrollmentPrevious;
    // If enrollment dropped by 10%, but spend stayed same, we have a delta.
    // Positive delta means spending too much relative to enrollment.
    const delta = Math.abs(enrollmentChange) * metrics.totalSpend;
    return {
        percentage: (enrollmentChange * 100).toFixed(1) + "%",
        opportunityDollar: delta.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    };
}

export function calculateEfficiencyScore(data: {
    serviceCoverage: number; // 0-100
    costOptimization: number; // 0-100
    utilization: number; // 0-100
    riskManagement: number; // 0-100
}) {
    const score = (data.serviceCoverage * 0.3) +
        (data.costOptimization * 0.25) +
        (data.utilization * 0.2) +
        (data.riskManagement * 0.15);

    return score.toFixed(1);
}
