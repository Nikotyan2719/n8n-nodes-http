import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class IVN8N implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IVN8N',
		name: 'ivn8n',
		icon: 'fa:search',
		group: ['transform'],
		version: 1,
		description: 'IVN8N Node with multiple operations',
		defaults: {
			name: 'IVN8N',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search operation',
						action: 'Perform search',
					},
					{
						name: 'Process Data',
						value: 'process',
						description: 'Data processing operation',
						action: 'Process data',
					},
				],
				default: 'search',
			},
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'API endpoint URL for search requests',
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '={{ $fromAI("query", "Search query", "string", "") }}',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Text to search for',
			},
			{
				displayName: 'Max Results',
				name: 'maxLimit',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Result Limit',
				name: 'limit',
				type: 'number',
				default: '={{ $fromAI("limit", "Number of results", "number", 5) }}',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				description: 'Max number of results to return',
				validateType: 'number',
				typeOptions: {
					minValue: 1,
					numberStepSize: 1,
				},
			},
			{
				displayName: 'Input Data',
				name: 'inputData',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['process'],
					},
				},
				description: 'Data to process',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'search') {
					const apiUrl = this.getNodeParameter('apiUrl', i) as string;
					const query = this.getNodeParameter('query', i) as string;
					const maxLimit = this.getNodeParameter('maxLimit', i) as number;
					let limit;
					if (!apiUrl) { throw new NodeOperationError(this.getNode(), 'API URL is required'); }
					try {
						limit = this.getNodeParameter('limit', i) as number;
						limit = Math.max(1, Math.min(limit, maxLimit));
					} catch (e) {
						limit = 1;
					}
					const responseData = await this.helpers.httpRequest({
						method: 'GET',
						url: apiUrl,
						qs: {
							query,
							k: limit,
						},
						json: true,
						headers: {
							'accept': 'application/json',
						},
					});

					const formattedResponse = Array.isArray(responseData) ? responseData.map((item: any) => item.page_content || '') : [];
					returnData.push({
						json: {
							status: 'ok',
							query,
							limit,
							results: formattedResponse,
						},
					});
				}
				else if (operation === 'process') {
					const inputData = this.getNodeParameter('inputData', i) as string;
					const processedData = `Processed: ${inputData}`;
					returnData.push({
						json: {
							status: 'ok',
							operation: 'process',
							result: processedData,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							status: 'error',
							error: error.message,
							operation: this.getNodeParameter('operation', i, 'unknown') as string,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
