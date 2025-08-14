import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class QdrantSearch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qdrant Search',
		name: 'qdrantSearch',
		group: ['transform'],
		version: 1,
		description: 'Makes a GET request to Qdrant search API',
		defaults: { name: 'Qdrant Search' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'URL to make the HTTP request',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Search query string',
				required: true,
			},
			{
				displayName: 'Limit',
				name: 'resultsLimit',
				type: 'number',
				default: 4,
				description: 'Number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const data: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const apiUrl = this.getNodeParameter('apiUrl', i) as string;
				const query = this.getNodeParameter('query', i) as string;
				const limit = this.getNodeParameter('resultsLimit', i) as number | undefined;
				const queryParams: Record<string, any> = { query };
				if (limit) { queryParams.k = limit; }
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: apiUrl,
					qs: queryParams,
					json: true,
					headers: {
						'accept': 'application/json'
					},
				});

				const formattedResponse = Array.isArray(response)
					? response.map((item: any) => ({
						page_content: item.page_content || ''
					}))
					: [];

				data.push({
					json: {
						...items[i].json,
						status: 'ok',
						result: formattedResponse
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					data.push({
						json: {
							status: 'error',
							error: error.message,
							input: items[i].json
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}
		return [data];
	}
}
