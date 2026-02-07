/**
 * Charts Module - Chart.js wrapper for finance dashboard
 */
const Charts = {
    charts: {},
    colors: {
        bank: '#3b82f6',
        credit: '#ef4444',
        stocks: '#8b5cf6',
        funds: '#00d2ff',
        assets: '#f59e0b',
        categories: {
            food: '#ef4444',
            transport: '#3b82f6',
            shopping: '#8b5cf6',
            entertainment: '#f59e0b',
            bills: '#10b981',
            health: '#ec4899',
            education: '#6366f1',
            other: '#6b7280'
        }
    },

    /**
     * Default chart options
     */
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#8892b0',
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            }
        }
    },

    /**
     * Create or update asset distribution pie chart
     */
    updateAssetDistribution(data) {
        const ctx = document.getElementById('assetDistributionChart');
        if (!ctx) return;

        const isHebrew = I18n.currentLanguage === 'he';
        const labels = isHebrew
            ? ['בנק', 'מניות', 'קרנות', 'נכסים']
            : ['Bank', 'Stocks', 'Funds', 'Assets'];

        const chartData = {
            labels: labels,
            datasets: [{
                data: [data.bank || 0, data.stocks || 0, data.funds || 0, data.assets || 0],
                backgroundColor: [
                    this.colors.bank,
                    this.colors.stocks,
                    this.colors.funds,
                    this.colors.assets
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        };

        if (this.charts.assetDistribution) {
            this.charts.assetDistribution.data = chartData;
            this.charts.assetDistribution.update();
        } else {
            this.charts.assetDistribution = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    ...this.defaultOptions,
                    cutout: '60%',
                    plugins: {
                        ...this.defaultOptions.plugins,
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${I18n.formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Create or update monthly expenses chart
     */
    updateMonthlyExpenses() {
        const ctx = document.getElementById('monthlyExpensesChart');
        if (!ctx) return;

        const creditData = Storage.getCreditCards();
        const categoryTotals = {};

        // Calculate totals by category for current month
        const currentMonth = App.getCurrentMonth();
        creditData.expenses
            .filter(exp => exp.date.startsWith(currentMonth))
            .forEach(exp => {
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
            });

        const categories = Object.keys(categoryTotals);
        const isHebrew = I18n.currentLanguage === 'he';

        const labels = categories.map(cat =>
            I18n.t(`credit.categories.${cat}`) || cat
        );

        const chartData = {
            labels: labels,
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: categories.map(cat => this.colors.categories[cat] || this.colors.categories.other),
                borderWidth: 0,
                hoverOffset: 10
            }]
        };

        if (this.charts.monthlyExpenses) {
            this.charts.monthlyExpenses.data = chartData;
            this.charts.monthlyExpenses.update();
        } else {
            this.charts.monthlyExpenses = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: {
                    ...this.defaultOptions,
                    plugins: {
                        ...this.defaultOptions.plugins,
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${I18n.formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Create balance history line chart
     */
    createBalanceHistory(canvasId, history, label, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

        const chartData = {
            labels: sortedHistory.map(h => I18n.formatDate(h.date)),
            datasets: [{
                label: label,
                data: sortedHistory.map(h => h.balance),
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].data = chartData;
            this.charts[canvasId].update();
        } else {
            this.charts[canvasId] = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    ...this.defaultOptions,
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#8892b0'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#8892b0',
                                callback: (value) => I18n.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Create stock portfolio pie chart
     */
    createPortfolioChart(canvasId, holdings) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Use valueILS if available (from broker import), otherwise calculate
        const getValue = (h) => {
            if (h.valueILS && h.valueILS > 0) {
                return h.valueILS;
            }
            // Fallback calculation for manual stocks
            return h.quantity * (h.currentPrice || h.avgPrice);
        };

        const chartData = {
            labels: holdings.map(h => h.symbol),
            datasets: [{
                data: holdings.map(h => getValue(h)),
                backgroundColor: holdings.map((_, i) =>
                    `hsl(${(i * 360 / holdings.length)}, 70%, 60%)`
                ),
                borderWidth: 0,
                hoverOffset: 10
            }]
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].data = chartData;
            this.charts[canvasId].update();
        } else {
            this.charts[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    ...this.defaultOptions,
                    cutout: '50%',
                    plugins: {
                        ...this.defaultOptions.plugins,
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ₪${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Create bar chart for expenses comparison
     */
    createExpenseComparisonChart(canvasId, monthlyData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const chartData = {
            labels: monthlyData.map(m => m.month),
            datasets: [{
                label: I18n.t('credit.monthlyTotal'),
                data: monthlyData.map(m => m.total),
                backgroundColor: this.colors.credit + '80',
                borderColor: this.colors.credit,
                borderWidth: 2,
                borderRadius: 5
            }]
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].data = chartData;
            this.charts[canvasId].update();
        } else {
            this.charts[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    ...this.defaultOptions,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#8892b0'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#8892b0',
                                callback: (value) => I18n.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Destroy a specific chart
     */
    destroy(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    },

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(id => this.destroy(id));
    }
};

// Make available globally
window.Charts = Charts;
