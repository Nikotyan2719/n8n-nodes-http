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
		description: 'IVN8N Node',
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
						name: 'Add Blog Post',
						value: 'addBlogPost',
						description: 'Add blog post in bitrix24',
						action: 'Add blog post',
					},
				],
				default: 'search',
			},
			// ----------------------------------
			//         search information
			// ----------------------------------
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
			// ----------------------------------
			//         bitrix:sendPost
			// ----------------------------------
			{
				displayName: 'User',
				name: 'user',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['addBlogPost'],
					},
				},
				options: [
					{
						name: 'All',
						value: 'all',

						action: 'Add blog for all users',
					},
					{
						name: 'Target',
						value: 'target',

						action: 'Add blog for target user',
					},

				],
				default: 'all',
			},
			{
				displayName: 'TargetUser',
				name: 'targetUser',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						user: ['target'],
					},
				},
				description: 'User ID to send the message to',
			},
			{
				displayName: 'PostTitle',
				name: 'postTitle',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['addBlogPost'],
					},
				},
				description: 'Title of the post',
			},
			{
				displayName: 'PostMessage',
				name: 'postMessage',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['addBlogPost'],
					},
				},
				typeOptions: {
					rows: 5,
				},
				description: 'Message of the post',
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
					if (!apiUrl) { throw new NodeOperationError(this.getNode(), 'API URL is required'); }
					const query = this.getNodeParameter('query', i) as string;
					const maxLimit = this.getNodeParameter('maxLimit', i) as number;
					let limit = this.getNodeParameter('limit', i) as number;
					limit = Math.max(1, Math.min(limit, maxLimit));
					const responseData = await this.helpers.httpRequest({
						method: 'GET',
						url: apiUrl,
						qs: { query, k: limit, },
						json: true,
						headers: {
							'accept': 'application/json',
						},
					});
					const formatted = Array.isArray(responseData) ? responseData.map((item: any) => item.page_content || '') : [];
					returnData.push({
						json: {
							status: 'ok',
							query,
							limit,
							results: formatted,
						},
					});
				}
				else if (operation === 'blogPost') {
					const target = this.getNodeParameter('user', i) as string;
					const title = this.getNodeParameter('postTitle', i) as string;
					const message = this.getNodeParameter('postMessage', i) as string;
					let DEST = ['UA'];
					if (target === 'target') {
						let input = this.getNodeParameter('targetUser', i) as string;
						input = input.replace(/[\[\]'"]/g, '');
						DEST = input.split(',').filter(Boolean);
					}
					const params = {
						DEST,
						POST_MESSAGE: title,
						POST_TITLE: message,
					};
					returnData.push({
						json: {
							status: 'ok',
							operation: 'process',
							result: params,
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
