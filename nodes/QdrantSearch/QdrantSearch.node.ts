import type {
	IExecuteFunctions,
	IHttpRequestMethods,
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
		description: 'Makes a request to API Qdrant search',
		defaults: { name: 'Qdrant Search' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'POST',
				description: 'HTTP method to use',
			},
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://jsonplaceholder.typicode.com/posts',
				required: true,
				description: 'The URL of the API endpoint',
			},
			{
				displayName: 'Request Body',
				name: 'requestBody',
				type: 'string',
				default: '{}',
				description: 'Request body as a JSON string',
				typeOptions: {
					rows: 5,
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const data: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const httpMethod = this.getNodeParameter('httpMethod', i, 'POST') as IHttpRequestMethods;
				const apiUrl = this.getNodeParameter('apiUrl', i, '') as string;
				const requestBodyStr = this.getNodeParameter('requestBody', i, '{}') as string;
				let requestBody;
				if (requestBodyStr) {
					try {
						requestBody = JSON.parse(requestBodyStr);
					} catch (e) {
						throw new NodeOperationError(this.getNode(), 'Invalid JSON in request body');
					}
				}
				const response = await this.helpers.httpRequest({
					method: httpMethod,
					url: apiUrl,
					body: httpMethod === 'POST' ? requestBody : undefined,
					json: true,
				});
				data.push({
					json: {
						...items[i].json,
						request: requestBody,
						response,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					data.push({
						json: {
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
