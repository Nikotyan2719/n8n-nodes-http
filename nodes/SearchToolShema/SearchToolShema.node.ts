import type {
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class SearchToolShema implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Search Tool Shema',
		name: 'searchToolShema',
		group: ['ai'],
		version: 1,
		description: 'Makes a request to API search',
		defaults: { name: 'Search Tool Shema' },
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
				displayName: 'Default Limit',
				name: 'defaultLimit',
				type: 'number',
				default: 4,
				description: 'Default number of results to return',
			},
			{
				displayName: 'Max Limit',
				name: 'maxLimit',
				type: 'number',
				default: 100,
				description: 'Max number of results to return',
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
			{
				displayName: 'Query Field Description',
				name: 'queryDescription',
				type: 'string',
				default: 'Search query text',
				description: 'Description for the query field in the tool schema',
			},
			{
				displayName: 'Limit Field Description',
				name: 'limitDescription',
				type: 'string',
				default: 'Max number of results to return',
				description: 'Description for the limit field in the tool schema',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const apiUrl = this.getNodeParameter('apiUrl', itemIndex, '') as string;
		const description = this.getNodeParameter('description', itemIndex, 'Searches in Qdrant vector database') as string;
		const defaultLimit = this.getNodeParameter('defaultLimit', itemIndex) as number;
		const maxLimit = this.getNodeParameter('maxLimit', itemIndex) as number;
		const queryDescription = this.getNodeParameter('queryDescription', itemIndex, 'Search query text') as string;
		const limitDescription = this.getNodeParameter('limitDescription', itemIndex, 'Number of results to return') as string;


		if (!apiUrl) {
			throw new NodeOperationError(this.getNode(), 'API URL is required');
		}

		const tool = new DynamicStructuredTool({
			name: "qdrant_search_tool",
			description: description,
			schema: z.object({
				query: z.string().describe(queryDescription),
				limit: z.number().int().min(1).max(maxLimit).default(defaultLimit).describe(limitDescription)
			}),
			func: async ({ query, limit }) => {
				const finalLimit = Math.min(limit, maxLimit);
				const { index } = this.addInputData(NodeConnectionType.AiTool, [[{
					json: { query, limit: finalLimit }
				}]]);

				try {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: apiUrl,
						qs: {
							query,
							k: finalLimit
						},
						json: true,
						headers: {
							'accept': 'application/json'
						}
					});

					const formattedResponse = Array.isArray(response)
						? response.map(item => item.page_content || '')
						: [];

					const result = {
						status: 'ok',
						query: query,
						limit: finalLimit,
						result: formattedResponse
					};

					this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: result }]]);
					return JSON.stringify(result, null, 2);

				} catch (error) {
					const nodeError = {
						status: 'error',
						error: error.message,
						request: { query, limit: finalLimit },
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
