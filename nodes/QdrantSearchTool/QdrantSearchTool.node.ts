import type {
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicTool } from '@langchain/core/tools';

export class QdrantSearchTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qdrant Search Tool',
		name: 'qdrantSearchTool',
		group: ['ai'],
		version: 1,
		description: 'Makes a request to API Qdrant search',
		defaults: { name: 'Qdrant Search Tool' },
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
				description: 'URL to make the HTTP request',
			},
			{
				displayName: 'Limit',
				name: 'resultsLimit',
				type: 'number',
				default: 4,
				description: 'Number of results to return',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: 'Makes a request to API',
				description: 'Tool description for the AI',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const apiUrl = this.getNodeParameter('apiUrl', itemIndex, '') as string;
		const description = this.getNodeParameter('description', itemIndex, 'Makes an HTTP request with the provided query string using Qdrant') as string;

		if (!apiUrl) {
			throw new NodeOperationError(this.getNode(), 'API URL is required');
		}

		const tool = new DynamicTool({
			name: "Qdrant_http_request_tool",
			description: description,
			func: async (query: string) => {
				const { index } = this.addInputData(NodeConnectionType.AiTool, [[{
					json: { query }
				}]]);

				try {
					const limit = this.getNodeParameter('resultsLimit', itemIndex) as number | undefined;
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
						? response.map(item => ({ page_content: item.page_content || '' }))
						: [];

					const result = {
						status: 'ok',
						response: response,
						url: apiUrl,
						qs: queryParams,
						result: formattedResponse
					};

					this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: result }]]);
					return JSON.stringify(result, null, 2);
				} catch (error) {
					const nodeError = {
						status: 'error',
						error: error.message,
						request: { query },
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
