import type {
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { DynamicTool } from '@langchain/core/tools';

export class PlaceholderRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JSONPlaceholder Post Fetcher',
		name: 'jsonPlaceholderPostFetcher',
		group: ['ai'],
		version: 1,
		description: 'Fetches a post from JSONPlaceholder API by post ID',
		defaults: {
			name: 'JSONPlaceholder Post Fetcher',
		},
		inputs: [],
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			{
				displayName: 'API Base URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://jsonplaceholder.typicode.com',
				required: true,
				description: 'Base URL of the JSONPlaceholder API',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: 'Fetches a post from JSONPlaceholder API by post ID',
				description: 'Description of what this tool does',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const baseUrl = this.getNodeParameter('apiUrl', itemIndex, 'https://jsonplaceholder.typicode.com') as string;
		const description = this.getNodeParameter('description', itemIndex, 'Fetches a post from JSONPlaceholder API by post ID') as string;

		const toolHandler = async (input: string | IDataObject): Promise<string> => {
			const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { input } }]]);

			try {
				// Парсим входные данные
				let postId: number;

				if (typeof input === 'string') {
					// Если строка - это просто число
					const numericMatch = input.trim().match(/^\d+$/);
					if (numericMatch) {
						postId = parseInt(numericMatch[0], 10);
					} else {
						// Пробуем распарсить JSON
						try {
							const parsed = JSON.parse(input);
							if (typeof parsed === 'object' && parsed !== null && 'postId' in parsed) {
								postId = Number(parsed.postId);
							} else if (typeof parsed === 'number') {
								postId = parsed;
							} else {
								throw new NodeOperationError(
									this.getNode(),
									'Invalid JSON format',
									{ description: 'Expected format: {\"postId\": number} or just a number' }
								);
							}
						} catch (e) {
							// Пробуем найти число в тексте
							const idMatch = input.match(/\d+/);
							if (!idMatch) {
								throw new NodeOperationError(
									this.getNode(),
									'No post ID found in the input',
									{ description: 'Please provide a valid post ID number' }
								);
							}
							postId = parseInt(idMatch[0], 10);
						}
					}
				} else if (typeof input === 'object' && input !== null && 'postId' in input) {
					// Если пришел объект с postId
					postId = Number((input as any).postId);
				} else if (typeof input === 'number') {
					// Если пришло просто число
					postId = input;
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid input format',
						{ description: 'Please provide a post ID as a number, string, or {postId: number}' }
					);
				}

				// Проверяем, что ID валидный
				if (isNaN(postId) || postId < 1) {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid post ID',
						{ description: 'Post ID must be a positive number' }
					);
				}

				// Используем полученный postId для запроса
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}/posts/${postId}`,
					json: true,
				});

				// Формируем ответ
				const result = {
					success: true,
					request: { postId },
					response,
				};

				this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: result }]]);
				return JSON.stringify(result, null, 2);

			} catch (error) {
				const nodeError: IDataObject = {
					success: false,
					error: error.message,
					request: input,
				};

				if (error.response) {
					nodeError.statusCode = error.statusCode;
					nodeError.response = error.response;
				}

				this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: nodeError }]]);
				return JSON.stringify(nodeError, null, 2);
			}
		};

		const tool = new DynamicTool({
			name: 'placeholder_request',
			description: description || `Fetches a post from JSONPlaceholder API by post ID. Example: "Show me post number 1" or {\"postId\":1}`,
			func: toolHandler,
		});

		return {
			response: tool,
		};
	}
}
