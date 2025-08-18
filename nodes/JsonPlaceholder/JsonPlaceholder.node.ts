import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

const inputs = [NodeConnectionType.Main];
const outputs = [NodeConnectionType.Main];

export class JsonPlaceholder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'JSONPlaceholder',
    name: 'jsonPlaceholder',
    icon: 'fa:database',
    group: ['transform'],
    version: 1,
    description: 'Получение данных из JSONPlaceholder API',
    defaults: {
      name: 'JSONPlaceholder',
    },
    usableAsTool: true,
    inputs,
    outputs,
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Get Post',
            value: 'getPost',
            description: 'Get a post by ID',
            action: 'Get post',
          },
          {
            name: 'Get All Posts',
            value: 'getAllPosts',
            description: 'Get all posts',
            action: 'Get all posts',
          },
        ],
        default: 'getPost',
      },
      {
        displayName: 'Post ID',
        name: 'postId',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            operation: ['getPost'],
          },
        },
        description: 'The ID of the post to retrieve',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let responseData;

        if (operation === 'getPost') {
          const postId = this.getNodeParameter('postId', i) as number;
          responseData = await this.helpers.httpRequest({
            method: 'GET',
            url: `https://jsonplaceholder.typicode.com/posts/${postId}`,
            json: true,
          });
        } else if (operation === 'getAllPosts') {
          responseData = await this.helpers.httpRequest({
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts',
            json: true,
          });
        }

        returnData.push({ json: responseData });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error.message },
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
