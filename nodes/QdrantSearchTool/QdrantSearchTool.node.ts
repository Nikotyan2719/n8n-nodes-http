import type {
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicTool } from '@langchain/core/tools';

export class QdrantSearchTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qdrant Search Tool',
		name: 'qdrantSearchTool',
		group: ['ai'],
		version: 1,
		description: 'Makes an HTTP request with the provided query string',
		defaults: {
			name: 'Qdrant Search Tool',
		},
		inputs: [],
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://jsonplaceholder.typicode.com/posts',
				required: true,
				description: 'URL to make the HTTP request to',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'POST',
				description: 'HTTP method for the request',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: 'Makes an HTTP request with the provided query string',
				description: 'Tool description for the AI',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const apiUrl = this.getNodeParameter('apiUrl', itemIndex, '') as string;
		const httpMethod = this.getNodeParameter('httpMethod', itemIndex, 'POST') as IHttpRequestMethods;
		const description = this.getNodeParameter('description', itemIndex, 'Makes an HTTP request with the provided query string using Qdrant') as string;

		if (!apiUrl) {
			throw new NodeOperationError(this.getNode(), 'API URL is required');
		}

		const tool = new DynamicTool({
			name: "Qdrant_http_request_tool",
			description: description,
			func: async (input: string) => {
				const { index } = this.addInputData(NodeConnectionType.AiTool, [[{
					json: { query: input }
				}]]);

				try {
					const response = await this.helpers.httpRequest({
						method: httpMethod,
						url: apiUrl,
						body: httpMethod === 'POST' ? { query: input } : undefined,
						json: true,
					});

					const result = {
						success: true,
						request: { query: input },
						response,
					};

					this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: result }]]);
					return JSON.stringify(result, null, 2);
				} catch (error) {
					const nodeError = {
						success: false,
						error: error.message,
						request: { query: input },
						...(error.response && {
							statusCode: error.statusCode,
							response: error.response
						})
					};

					this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: nodeError }]]);
					return JSON.stringify(nodeError, null, 2);
				}
			}
		});

		return {
			response: tool,
		};
	}
}
