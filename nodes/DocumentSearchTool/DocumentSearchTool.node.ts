import type {
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export class DocumentSearchTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Document Search Tool',
		name: 'documentSearchTool',
		group: ['ai'],
		version: 1,
		description: 'Ищет документы по названию',
		defaults: {
			name: 'Document Search',
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
				description: 'URL API для поиска документов',
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
				description: 'HTTP метод для запроса',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: 'Ищет документы по названию. Пример: Найти "Отчет 2023" в количестве 3 штуки',
				description: 'Описание инструмента для ИИ',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const apiUrl = this.getNodeParameter('apiUrl', itemIndex, '') as string;
		const httpMethod = this.getNodeParameter('httpMethod', itemIndex, 'POST') as IHttpRequestMethods;
		const description = this.getNodeParameter('description', itemIndex, 'Searches for documents by name, keywords, or identifiers') as string;

		if (!apiUrl) {
			throw new NodeOperationError(this.getNode(), 'API URL is required');
		}

		const tool = new DynamicStructuredTool({
			name: "document_search",
			description: description,
			schema: z.object({
				documentName: z.string().describe(
					"EXACT user query. MUST include ALL original words in the exact same order. " +
					"DO NOT modify, summarize or extract keywords. " +
					"Examples: " +
					"- For 'find 15 documents about CRM deals' return 'find 15 documents about CRM deals' " +
					"- For 'show contracts with 1C integration' return 'show contracts with 1C integration'"
				),
				responseCount: z.number().optional().describe(
					"Number of results to return. " +
					"Extract from the query, for example: " +
					"- 'find 15 documents' → 15 " +
					"- 'show 3 contracts' → 3"
				)
			}),
			func: async ({ documentName, responseCount }) => {
				const { index } = this.addInputData(NodeConnectionType.AiTool, [[{
					json: { documentName, responseCount }
				}]]);

				try {
					const response = await this.helpers.httpRequest({
						method: httpMethod,
						url: apiUrl,
						body: httpMethod === 'POST' ? { documentName, responseCount } : undefined,
						json: true,
						headers: {
							'Content-Type': 'application/json',
						},
					});

					const result = {
						success: true,
						request: { documentName, responseCount },
						response,
					};

					this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: result }]]);
					return JSON.stringify(result, null, 2);
				} catch (error) {
					const nodeError = {
						success: false,
						error: error.message,
						request: { documentName, responseCount },
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
