import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

interface IApiResponse {
	// Определяем структуру ответа от API
	[key: string]: any;
}

export class ApiRequestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'API Request',
		name: 'apiRequest',
		group: ['transform'],
		version: 1,
		description: 'Makes a GET request to a public API',
		defaults: {
			name: 'API Request',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://jsonplaceholder.typicode.com/posts/1',
				required: true,
				description: 'The URL of the API endpoint',
			},
			{
				displayName: 'Response Property Name',
				name: 'responseProperty',
				type: 'string',
				default: 'apiResponse',
				description: 'Name of the property to store the API response in',
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Получаем параметры из настроек узла
				const apiUrl = this.getNodeParameter('apiUrl', i, '') as string;
				const responseProperty = this.getNodeParameter('responseProperty', i, 'apiResponse') as string;

				// Делаем HTTP-запрос
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: apiUrl,
					json: true,
				}) as IApiResponse;

				// Создаем новый элемент с результатом
				const newItem: INodeExecutionData = {
					json: {
						...items[i].json, // Сохраняем оригинальные данные
						[responseProperty]: response, // Добавляем ответ API
					},
				};

				returnData.push(newItem);

			} catch (error) {
				// Обработка ошибок
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							input: items[i].json,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
