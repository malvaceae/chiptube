// Node.js Core Modules
import { randomFillSync } from 'crypto';

// Pluralize
import { singular } from 'pluralize';

// AWS Lambda
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';

// AWS SDK
import {
  CognitoIdentityServiceProvider,
  Comprehend,
  DynamoDB,
  Translate,
} from 'aws-sdk';

// AWS SDK - Cognito
const cognito = new CognitoIdentityServiceProvider({
  apiVersion: '2016-04-18',
});

// AWS SDK - Comprehend
const comprehend = new Comprehend({
  apiVersion: '2017-11-27',
});

// AWS SDK - DynamoDB
const dynamodb = new DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
});

// AWS SDK - Translate
const translate = new Translate({
  apiVersion: '2017-07-01',
});

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    for (const [{ resource, httpMethod }, route] of routes) {
      if (httpMethod === event.httpMethod) {
        if (resource === event.resource) {
          return await route(event);
        }
      }
    }

    return response({
      message: 'Not found',
    }, 404);
  } catch (e) {
    console.error(e);
    return response({
      message: 'Internal server error',
    }, 500);
  }
};

// List of Api Routes
const routes = new Map([
  [
    {
      resource: '/tunes',
      httpMethod: 'GET',
    },
    async ({ queryStringParameters }: APIGatewayProxyEvent) => {
      const exclusiveStartKey = (({ after }) => {
        if (after) {
          try {
            return JSON.parse(Buffer.from(after, 'base64').toString());
          } catch {
            //
          }
        }
      })(queryStringParameters ?? {});

      const { tunes, lastEvaluatedKey } = await (async ({ query }) => {
        // Get tunes with the search query if it exists.
        if (query) {
          // Tokenize the search query.
          const keywords = [...new Set(getWords(await tokenize(query)).map(normalize))];

          // Get tune ids by keyword.
          const tuneIdsByKeyword = await Promise.all(keywords.map((keyword) => {
            return dynamodb.query({
              TableName: process.env.APP_TABLE_NAME!,
              KeyConditionExpression: 'pk = :pk',
              ExpressionAttributeValues: {
                ':pk': `tuneKeyword#${keyword}`,
              },
            }).promise();
          }));

          // Get tune ids.
          const tuneIds = tuneIdsByKeyword.flatMap(({ Items }) => Items ?? []);

          // Get tune ids sorted by relevance.
          const sortedTuneIds = [...new Set(tuneIds.map(({ tuneId }) => tuneId))].sort((a, b) => {
            return (
              tuneIds.filter(({ tuneId }) => tuneId === b).reduce((sum, { occurrences }) => sum + occurrences, 0) -
              tuneIds.filter(({ tuneId }) => tuneId === a).reduce((sum, { occurrences }) => sum + occurrences, 0)
            );
          });

          // Skip to after the exclusive start key.
          if (typeof exclusiveStartKey === 'string' && exclusiveStartKey.length > 0) {
            sortedTuneIds.splice(0, sortedTuneIds.indexOf(exclusiveStartKey) + 1);
          }

          if (sortedTuneIds.length === 0) {
            return {};
          }

          // Set maximum number of tunes to evaluate.
          sortedTuneIds.splice(24);

          // Get raw responses.
          const { Responses: responses } = await dynamodb.batchGet({
            RequestItems: {
              [process.env.APP_TABLE_NAME!]: {
                Keys: sortedTuneIds.map((tuneId) => ({
                  pk: 'tunes',
                  sk: `tuneId#${tuneId}`,
                })),
              },
            },
          }).promise();

          // Get tunes.
          const tunes = responses?.[process.env.APP_TABLE_NAME!]?.sort?.((a, b) => {
            return sortedTuneIds.indexOf(a.id) - sortedTuneIds.indexOf(b.id);
          });

          // Get the last evaluated key.
          const lastEvaluatedKey = (() => {
            if (tunes?.length === 24) {
              return tunes?.[23]?.id;
            }
          })();

          return {
            tunes,
            lastEvaluatedKey,
          };
        } else {
          // Get tunes and the last evaluated key.
          const { Items: tunes, LastEvaluatedKey: lastEvaluatedKey } = await dynamodb.query({
            TableName: process.env.APP_TABLE_NAME!,
            IndexName: 'LSI-PublishedAt',
            Limit: 24,
            ScanIndexForward: false,
            ExclusiveStartKey: exclusiveStartKey,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
              ':pk': 'tunes',
            },
          }).promise();

          return {
            tunes,
            lastEvaluatedKey,
          };
        }
      })(queryStringParameters ?? {});

      if (!tunes?.length) {
        return response({
          tunes: [],
        });
      }

      const after = ((lastEvaluatedKey) => {
        if (lastEvaluatedKey) {
          try {
            return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
          } catch {
            //
          }
        }
      })(lastEvaluatedKey);

      // Get unique user ids.
      const userIds = [...new Set(tunes.map(({ userId }) => userId))];

      // Get raw responses.
      const { Responses: responses } = await dynamodb.batchGet({
        RequestItems: {
          [process.env.APP_TABLE_NAME!]: {
            Keys: userIds.map((userId) => ({
              pk: `userId#${userId}`,
              sk: `userId#${userId}`,
            })),
            AttributesToGet: [
              'id',
              'nickname',
              'picture',
            ],
          },
        },
      }).promise();

      // Get users.
      const users = responses?.[process.env.APP_TABLE_NAME!];

      if (users === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      // Get users by id.
      const usersById = Object.fromEntries(users.map((user) => {
        return [user.id, user];
      }));

      // Add user to tune.
      tunes.forEach((tune) => Object.assign(tune, {
        user: usersById[tune.userId],
      }));

      return response({
        tunes,
        after,
      });
    },
  ],
  [
    {
      resource: '/tunes',
      httpMethod: 'POST',
    },
    async ({ body, requestContext: { identity: { cognitoAuthenticationProvider, cognitoIdentityId: identityId } } }: APIGatewayProxyEvent) => {
      if (!cognitoAuthenticationProvider) {
        return response({
          message: 'Unauthorized',
        }, 401);
      }

      // Get the user id from cognito authentication provider.
      const userId = cognitoAuthenticationProvider.split(':').slice(-1)[0];

      // Parse the JSON of request body.
      const { title, description, midiKey } = JSON.parse(body ?? '{}');

      if (!title || !description || !midiKey) {
        return response({
          message: 'Unprocessable entity',
        }, 422);
      }

      while (true) {
        try {
          const id = [...randomFillSync(new Uint32Array(11))].map((i) => i % 64).map((i) => {
            return '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'[i];
          }).join('');

          await dynamodb.transactWrite({
            TransactItems: [
              {
                Put: {
                  TableName: process.env.APP_TABLE_NAME!,
                  Item: {
                    pk: 'tunes',
                    sk: `tuneId#${id}`,
                    id,
                    userId,
                    identityId,
                    lastViewedIdentityId: identityId,
                    title,
                    description,
                    midiKey,
                    publishedAt: Date.now(),
                    views: 0,
                    likes: 0,
                    favorites: 0,
                    comments: 0,
                  },
                  ConditionExpression: [
                    'attribute_not_exists(pk)',
                    'attribute_not_exists(sk)',
                  ].join(' AND '),
                },
              },
              {
                Put: {
                  TableName: process.env.APP_TABLE_NAME!,
                  Item: {
                    pk: `userId#${userId}`,
                    sk: `tuneId#${id}`,
                  },
                  ConditionExpression: [
                    'attribute_not_exists(pk)',
                    'attribute_not_exists(sk)',
                  ].join(' AND '),
                },
              },
            ],
          }).promise();

          // Tokenize title and description.
          const keywords = getWords(await tokenize([title, description].join())).map(normalize);

          // Get number of occurrences by keyword.
          const occurrences = [...keywords.reduce((keywords, keyword) => {
            return keywords.set(keyword, keywords.get(keyword)! + 1 || 1);
          }, new Map<string, number>)];

          // Add keywords.
          await Promise.all([...Array(Math.ceil(occurrences.length / 25)).keys()].map((i) => occurrences.slice(i * 25, (i + 1) * 25)).map((occurrences) => {
            return dynamodb.batchWrite({
              RequestItems: {
                [process.env.APP_TABLE_NAME!]: occurrences.map(([keyword, occurrences]) => ({
                  PutRequest: {
                    Item: {
                      pk: `tuneKeyword#${keyword}`,
                      sk: `tuneId#${id}`,
                      tuneId: id,
                      keyword,
                      occurrences,
                    },
                  },
                })),
              },
            }).promise();
          }));

          return response({ id });
        } catch (e: any) {
          if (e.code === 'TransactionCanceledException') {
            await new Promise((resolve) => {
              setTimeout(resolve, 1000);
            });
          } else {
            throw e;
          }
        }
      }
    },
  ],
  [
    {
      resource: '/tunes/{id}',
      httpMethod: 'GET',
    },
    async ({ pathParameters, requestContext: { identity: { cognitoAuthenticationProvider, cognitoIdentityId: identityId } } }: APIGatewayProxyEvent) => {
      // Get the tune id.
      const { id } = pathParameters ?? {};

      if (!id) {
        return response({
          message: 'Not found',
        }, 404);
      }

      try {
        await dynamodb.update({
          TableName: process.env.APP_TABLE_NAME!,
          Key: {
            pk: 'tunes',
            sk: `tuneId#${id}`,
          },
          UpdateExpression: `SET ${[
            'lastViewedIdentityId = :identityId',
            '#views = #views + :additionalValue',
          ].join(', ')}`,
          ConditionExpression: [
            'attribute_exists(pk)',
            'attribute_exists(sk)',
            'lastViewedIdentityId <> :identityId',
          ].join(' AND '),
          ExpressionAttributeNames: {
            '#views': 'views',
          },
          ExpressionAttributeValues: {
            ':identityId': identityId,
            ':additionalValue': 1,
          },
        }).promise();
      } catch {
        //
      }

      const { Item: tune } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: 'tunes',
          sk: `tuneId#${id}`,
        },
      }).promise();

      if (tune === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      const { Item: user } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: `userId#${tune.userId}`,
          sk: `userId#${tune.userId}`,
        },
        AttributesToGet: [
          'id',
          'nickname',
          'picture',
        ],
      }).promise();

      if (user === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      Object.assign(tune, {
        user,
      });

      if (!cognitoAuthenticationProvider) {
        return response(tune);
      }

      // Get the user id from cognito authentication provider.
      const userId = cognitoAuthenticationProvider.split(':').slice(-1)[0];

      const { Item: isLiked } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: `userId#${userId}`,
          sk: `tuneLikeId#${id}`,
        },
      }).promise();

      Object.assign(tune, {
        isLiked: !!isLiked,
      });

      return response(tune);
    },
  ],
  [
    {
      resource: '/tunes/{id}',
      httpMethod: 'PUT',
    },
    async ({ body, pathParameters, requestContext: { identity: { cognitoAuthenticationProvider } } }: APIGatewayProxyEvent) => {
      if (!cognitoAuthenticationProvider) {
        return response({
          message: 'Unauthorized',
        }, 401);
      }

      // Get the user id from cognito authentication provider.
      const userId = cognitoAuthenticationProvider.split(':').slice(-1)[0];

      // Parse the JSON of request body.
      const params = JSON.parse(body ?? '{}');

      // Get the tune id.
      const { id } = pathParameters ?? {};

      if (!id) {
        return response({
          message: 'Not found',
        }, 404);
      }

      if (typeof params.isLiked === 'boolean') {
        try {
          if (params.isLiked) {
            await dynamodb.transactWrite({
              TransactItems: [
                {
                  Put: {
                    TableName: process.env.APP_TABLE_NAME!,
                    Item: {
                      pk: `userId#${userId}`,
                      sk: `tuneLikeId#${id}`,
                    },
                    ConditionExpression: [
                      'attribute_not_exists(pk)',
                      'attribute_not_exists(sk)',
                    ].join(' AND '),
                  },
                },
                {
                  Update: {
                    TableName: process.env.APP_TABLE_NAME!,
                    Key: {
                      pk: 'tunes',
                      sk: `tuneId#${id}`,
                    },
                    UpdateExpression: 'ADD likes :additionalValue',
                    ConditionExpression: [
                      'attribute_exists(pk)',
                      'attribute_exists(sk)',
                    ].join(' AND '),
                    ExpressionAttributeValues: {
                      ':additionalValue': 1,
                    },
                  },
                },
              ],
            }).promise();
          } else {
            await dynamodb.transactWrite({
              TransactItems: [
                {
                  Delete: {
                    TableName: process.env.APP_TABLE_NAME!,
                    Key: {
                      pk: `userId#${userId}`,
                      sk: `tuneLikeId#${id}`,
                    },
                    ConditionExpression: [
                      'attribute_exists(pk)',
                      'attribute_exists(sk)',
                    ].join(' AND '),
                  },
                },
                {
                  Update: {
                    TableName: process.env.APP_TABLE_NAME!,
                    Key: {
                      pk: 'tunes',
                      sk: `tuneId#${id}`,
                    },
                    UpdateExpression: 'ADD likes :additionalValue',
                    ConditionExpression: [
                      'attribute_exists(pk)',
                      'attribute_exists(sk)',
                    ].join(' AND '),
                    ExpressionAttributeValues: {
                      ':additionalValue': -1,
                    },
                  },
                },
              ],
            }).promise();
          }
        } catch {
          //
        }
      }

      const { Item: tune } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: 'tunes',
          sk: `tuneId#${id}`,
        },
      }).promise();

      if (tune === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      const { Item: user } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: `userId#${tune.userId}`,
          sk: `userId#${tune.userId}`,
        },
        AttributesToGet: [
          'id',
          'nickname',
          'picture',
        ],
      }).promise();

      if (user === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      Object.assign(tune, {
        user,
      });

      const { Item: isLiked } = await dynamodb.get({
        TableName: process.env.APP_TABLE_NAME!,
        Key: {
          pk: `userId#${userId}`,
          sk: `tuneLikeId#${id}`,
        },
      }).promise();

      Object.assign(tune, {
        isLiked: !!isLiked,
      });

      return response(tune);
    },
  ],
  [
    {
      resource: '/tunes/{id}/tunes',
      httpMethod: 'GET',
    },
    async ({ pathParameters, queryStringParameters }: APIGatewayProxyEvent) => {
      // Get the tune id.
      const { id } = pathParameters ?? {};

      if (!id) {
        return response({
          message: 'Not found',
        }, 404);
      }

      const exclusiveStartKey = (({ after }) => {
        if (after) {
          try {
            return JSON.parse(Buffer.from(after, 'base64').toString());
          } catch {
            //
          }
        }
      })(queryStringParameters ?? {});

      const { tunes, lastEvaluatedKey } = await (async () => {
        // Get keywords.
        const { Items: keywords } = await dynamodb.query({
          TableName: process.env.APP_TABLE_NAME!,
          IndexName: 'GSI-AdjacencyList',
          KeyConditionExpression: [
            'sk = :sk',
            'begins_with(pk, :pk)',
          ].join(' AND '),
          ExpressionAttributeValues: {
            ':sk': `tuneId#${id}`,
            ':pk': 'tuneKeyword#',
          },
        }).promise();

        if (keywords === undefined) {
          return {};
        }

        // Get tune ids by keyword.
        const tuneIdsByKeyword = await Promise.all(keywords.map(({ keyword }) => {
          return dynamodb.query({
            TableName: process.env.APP_TABLE_NAME!,
            FilterExpression: 'tuneId <> :tuneId',
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
              ':pk': `tuneKeyword#${keyword}`,
              ':tuneId': id,
            },
          }).promise();
        }));

        // Get tune ids.
        const tuneIds = tuneIdsByKeyword.flatMap(({ Items }) => Items ?? []);

        // Get tune ids sorted by relevance.
        const sortedTuneIds = [...new Set(tuneIds.map(({ tuneId }) => tuneId))].sort((a, b) => {
          return (
            tuneIds.filter(({ tuneId }) => tuneId === b).reduce((sum, { occurrences }) => sum + occurrences, 0) -
            tuneIds.filter(({ tuneId }) => tuneId === a).reduce((sum, { occurrences }) => sum + occurrences, 0)
          );
        });

        // Skip to after the exclusive start key.
        if (typeof exclusiveStartKey === 'string' && exclusiveStartKey.length > 0) {
          sortedTuneIds.splice(0, sortedTuneIds.indexOf(exclusiveStartKey) + 1);
        }

        if (sortedTuneIds.length === 0) {
          return {};
        }

        // Set maximum number of tunes to evaluate.
        sortedTuneIds.splice(24);

        // Get raw responses.
        const { Responses: responses } = await dynamodb.batchGet({
          RequestItems: {
            [process.env.APP_TABLE_NAME!]: {
              Keys: sortedTuneIds.map((tuneId) => ({
                pk: 'tunes',
                sk: `tuneId#${tuneId}`,
              })),
            },
          },
        }).promise();

        // Get tunes.
        const tunes = responses?.[process.env.APP_TABLE_NAME!]?.sort?.((a, b) => {
          return sortedTuneIds.indexOf(a.id) - sortedTuneIds.indexOf(b.id);
        });

        // Get the last evaluated key.
        const lastEvaluatedKey = (() => {
          if (tunes?.length === 24) {
            return tunes?.[23]?.id;
          }
        })();

        return {
          tunes,
          lastEvaluatedKey,
        };
      })();

      if (!tunes?.length) {
        return response({
          tunes: [],
        });
      }

      const after = ((lastEvaluatedKey) => {
        if (lastEvaluatedKey) {
          try {
            return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
          } catch {
            //
          }
        }
      })(lastEvaluatedKey);

      // Get unique user ids.
      const userIds = [...new Set(tunes.map(({ userId }) => userId))];

      // Get raw responses.
      const { Responses: responses } = await dynamodb.batchGet({
        RequestItems: {
          [process.env.APP_TABLE_NAME!]: {
            Keys: userIds.map((userId) => ({
              pk: `userId#${userId}`,
              sk: `userId#${userId}`,
            })),
            AttributesToGet: [
              'id',
              'nickname',
              'picture',
            ],
          },
        },
      }).promise();

      // Get users.
      const users = responses?.[process.env.APP_TABLE_NAME!];

      if (users === undefined) {
        return response({
          message: 'Not found',
        }, 404);
      }

      // Get users by id.
      const usersById = Object.fromEntries(users.map((user) => {
        return [user.id, user];
      }));

      // Add user to tune.
      tunes.forEach((tune) => Object.assign(tune, {
        user: usersById[tune.userId],
      }));

      return response({
        tunes,
        after,
      });
    },
  ],
  [
    {
      resource: '/users/me',
      httpMethod: 'PUT',
    },
    async ({ body, requestContext: { identity: { cognitoAuthenticationProvider } } }: APIGatewayProxyEvent) => {
      if (!cognitoAuthenticationProvider) {
        return response({
          message: 'Unauthorized',
        }, 401);
      }

      // Get the user id from cognito authentication provider.
      const userId = cognitoAuthenticationProvider.split(':').slice(-1)[0];

      // Get the user pool id from cognito authentication provider.
      const userPoolId = cognitoAuthenticationProvider.split(':')[0].split('/').slice(-1)[0];

      // Parse the JSON of request body.
      const params = JSON.parse(body ?? '{}');

      if (params.nickname && typeof params.nickname === 'string') {
        const { Attributes: user } = await dynamodb.update({
          TableName: process.env.APP_TABLE_NAME!,
          Key: {
            pk: `userId#${userId}`,
            sk: `userId#${userId}`,
          },
          ReturnValues: 'ALL_NEW',
          UpdateExpression: `SET ${[
            '#nickname = :nickname',
          ].join(', ')}`,
          ConditionExpression: [
            'attribute_exists(pk)',
            'attribute_exists(sk)',
          ].join(' AND '),
          ExpressionAttributeNames: {
            '#nickname': 'nickname',
          },
          ExpressionAttributeValues: {
            ':nickname': params.nickname,
          },
        }).promise();

        if (!user) {
          throw Error('The user not found.');
        }

        await cognito.adminUpdateUserAttributes({
          UserPoolId: userPoolId,
          Username: user.userName,
          UserAttributes: [
            {
              Name: 'nickname',
              Value: params.nickname,
            },
          ],
        }).promise();
      }

      return response({
        message: 'OK',
      });
    },
  ],
]);

const tokenize = async (text: string): Promise<Comprehend.ListOfSyntaxTokens> => {
  // Translate text to English.
  const { TranslatedText: translatedText } = await translate.translateText({
    Text: text.normalize('NFKC'),
    SourceLanguageCode: 'auto',
    TargetLanguageCode: 'en',
  }).promise();

  // Detect syntax.
  const { SyntaxTokens: syntaxTokens } = await comprehend.detectSyntax({
    Text: translatedText,
    LanguageCode: 'en',
  }).promise();

  if (!syntaxTokens) {
    return [];
  }

  return syntaxTokens;
};

const getWords = (syntaxTokens: Comprehend.ListOfSyntaxTokens): string[] => {
  return syntaxTokens.filter(({ PartOfSpeech: partOfSpeech }) => {
    return !/^(?:ADP|DET|PUNCT)$/.test(partOfSpeech?.Tag ?? '');
  }).flatMap(({ Text: word }) => word ? [word] : []);
};

const normalize = (word: string): string => {
  return singular(word.toLowerCase());
};

const response = (body: any, statusCode = 200): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};
