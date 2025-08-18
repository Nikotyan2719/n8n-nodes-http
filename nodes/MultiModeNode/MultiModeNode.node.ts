import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class MultiModeNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Multi-Mode Node',
		name: 'multiModeNode',
		icon: 'fa:magic',
		group: ['transform'],
		version: 1,
		description: 'Пример узла, работающего и как обычный узел, и как инструмент AI',
		defaults: {
			name: 'Multi-Mode Node',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main, NodeConnectionType.AiTool],
		outputNames: ['Main', 'Tool'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Greet', value: 'greet' },
					{ name: 'Calculate', value: 'calculate' },
				],
				default: 'greet',
				required: true,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['greet'] },
				},
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'number',
				default: 0,
				displayOptions: {
					show: { operation: ['calculate'] },
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'greet') {
					const name = this.getNodeParameter('name', i) as string;
					returnData.push({ json: { result: `Hello, ${name}!` } });
				}
				else if (operation === 'calculate') {
					const number = this.getNodeParameter('number', i) as number;
					returnData.push({ json: { result: number * 2 } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'greet') {
			const tool = new DynamicStructuredTool({
				name: 'greet_tool',
				description: 'Generates a greeting message',
				schema: z.object({
					name: z.string().describe('Person name to greet'),
				}),
				func: async ({ name }) => {
					return JSON.stringify({ result: `Hello, ${name}!` });
				},
			});
			return { response: tool };
		}
		else if (operation === 'calculate') {
			const tool = new DynamicStructuredTool({
				name: 'calculate_tool',
				description: 'Doubles the input number',
				schema: z.object({
					number: z.number().describe('Number to double'),
				}),
				func: async ({ number }) => {
					return JSON.stringify({ result: number * 2 });
				},
			});
			return { response: tool };
		}

		throw new NodeOperationError(this.getNode(), 'Unsupported operation for AI tool');
	}
}
