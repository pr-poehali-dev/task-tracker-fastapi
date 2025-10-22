import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления тегами с поддержкой CRUD операций
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if method == 'GET':
            cursor.execute('''
                SELECT id, name, color, description, created_at, updated_at
                FROM tags
                ORDER BY name ASC
            ''')
            tags = cursor.fetchall()
            
            tags_list = []
            for tag in tags:
                tag_dict = dict(tag)
                if tag_dict.get('created_at'):
                    tag_dict['created_at'] = tag_dict['created_at'].isoformat()
                if tag_dict.get('updated_at'):
                    tag_dict['updated_at'] = tag_dict['updated_at'].isoformat()
                tags_list.append(tag_dict)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'tags': tags_list}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            cursor.execute('''
                INSERT INTO tags (name, color, description)
                VALUES (%s, %s, %s)
                RETURNING id, name, color, description, created_at, updated_at
            ''', (
                body.get('name'),
                body.get('color'),
                body.get('description')
            ))
            
            tag = cursor.fetchone()
            conn.commit()
            
            tag_dict = dict(tag)
            if tag_dict.get('created_at'):
                tag_dict['created_at'] = tag_dict['created_at'].isoformat()
            if tag_dict.get('updated_at'):
                tag_dict['updated_at'] = tag_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'tag': tag_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            tag_id = body.get('id')
            
            cursor.execute('''
                UPDATE tags 
                SET name = %s, color = %s, description = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, name, color, description, created_at, updated_at
            ''', (
                body.get('name'),
                body.get('color'),
                body.get('description'),
                tag_id
            ))
            
            tag = cursor.fetchone()
            conn.commit()
            
            if not tag:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Tag not found'}),
                    'isBase64Encoded': False
                }
            
            tag_dict = dict(tag)
            if tag_dict.get('created_at'):
                tag_dict['created_at'] = tag_dict['created_at'].isoformat()
            if tag_dict.get('updated_at'):
                tag_dict['updated_at'] = tag_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'tag': tag_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            tag_id = params.get('id')
            
            cursor.execute('DELETE FROM tags WHERE id = %s RETURNING id', (tag_id,))
            deleted = cursor.fetchone()
            conn.commit()
            
            if not deleted:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Tag not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cursor.close()
        conn.close()
