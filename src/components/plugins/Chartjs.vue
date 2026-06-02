<script>
import Chart from 'chart.js/auto';
import { nextTick } from 'vue';
import { useAppVariableStore } from '@/stores/app-variable';

const appVariable = useAppVariableStore();

let defaultsApplied = false;

function applyChartDefaults() {
	if (defaultsApplied) return;
	defaultsApplied = true;
	Chart.defaults.font.family = appVariable.font.bodyFontFamily;
	Chart.defaults.font.size = 12;
	Chart.defaults.color = appVariable.color.bodyColor;
	Chart.defaults.borderColor = appVariable.color.borderColor;
	Chart.defaults.plugins.legend.display = false;
	Chart.defaults.plugins.tooltip.padding = { left: 8, right: 12, top: 8, bottom: 8 };
	Chart.defaults.plugins.tooltip.cornerRadius = 8;
	Chart.defaults.plugins.tooltip.titleMarginBottom = 6;
	Chart.defaults.plugins.tooltip.color = appVariable.color.componentBg;
	Chart.defaults.plugins.tooltip.multiKeyBackground = appVariable.color.componentColor;
	Chart.defaults.plugins.tooltip.backgroundColor = appVariable.color.componentColor;
	Chart.defaults.plugins.tooltip.titleFont.family = appVariable.font.bodyFontFamily;
	Chart.defaults.plugins.tooltip.titleFont.weight = appVariable.font.bodyFontWeight;
	Chart.defaults.plugins.tooltip.footerFont.family = appVariable.font.bodyFontFamily;
	Chart.defaults.plugins.tooltip.displayColors = true;
	Chart.defaults.plugins.tooltip.boxPadding = 6;
	Chart.defaults.scale.grid.color = appVariable.color.borderColor;
	Chart.defaults.scale.beginAtZero = true;
}

export default {
	props: ['data', 'type', 'options', 'width', 'height'],
	data() {
		return {
			chart: null,
			resizeObserver: null,
		};
	},
	mounted() {
		applyChartDefaults();
		this.createChart();
		nextTick(() => {
			this.chart?.resize();
			this.bindResize();
		});
	},
	beforeUnmount() {
		this.unbindResize();
		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}
	},
	methods: {
		createChart() {
			const opts = {
				...(this.$props.options || {}),
				responsive: this.$props.options?.responsive !== false,
				maintainAspectRatio: this.$props.options?.maintainAspectRatio ?? true,
			};
			this.chart = new Chart(this.$refs.canvas, {
				type: this.$props.type,
				data: this.$props.data,
				options: opts,
			});
		},
		bindResize() {
			const host = this.$refs.host;
			if (!host) return;

			if (typeof ResizeObserver !== 'undefined') {
				this.resizeObserver = new ResizeObserver(() => {
					this.chart?.resize();
				});
				this.resizeObserver.observe(host);
			}

			this._onWindowResize = () => this.chart?.resize();
			window.addEventListener('resize', this._onWindowResize);
		},
		unbindResize() {
			this.resizeObserver?.disconnect();
			this.resizeObserver = null;
			if (this._onWindowResize) {
				window.removeEventListener('resize', this._onWindowResize);
				this._onWindowResize = null;
			}
		},
	},
};
</script>

<template>
	<div ref="host" class="chartjs-host">
		<canvas ref="canvas" />
	</div>
</template>

<style scoped>
.chartjs-host {
	position: relative;
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
