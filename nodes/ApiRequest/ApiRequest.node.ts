import type {
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class ApiRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'API Request',
		name: 'apiRequest',
		group: ['transform'],
		version: 1,
		description: 'Makes a request to a specified API endpoint',
		defaults: { name: 'API Request' },
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
				displayName: 'Document Name',
				name: 'documentName',
				type: 'string',
				required: true,
				default: '',
				description: 'Name of the document to process',
			},
			{
				displayName: 'Response Count',
				name: 'responseCount',
				type: 'number',
				default: '',
				description: 'Number of responses to request (optional)',
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
				const documentName = this.getNodeParameter('documentName', i, '') as string;
				const responseCount = this.getNodeParameter('responseCount', i, '') as number;

				const requestData: any = { documentName };
				if (responseCount) requestData.responseCount = responseCount;

				const response = await this.helpers.httpRequest({
					method: httpMethod,
					url: apiUrl,
					body: httpMethod === 'POST' ? requestData : undefined,
					json: true,
				});
				data.push({
					json: {
						...items[i].json,
						request: requestData,
						response,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					data.push({
						json: { error: error.message, input: items[i].json },
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
