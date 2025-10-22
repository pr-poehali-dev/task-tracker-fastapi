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
    Business: API для управления проектами с поддержкой CRUD операций
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
                SELECT id, name, description, color, created_at, updated_at
                FROM projects
                ORDER BY name ASC
            ''')
            projects = cursor.fetchall()
            
            projects_list = []
            for project in projects:
                project_dict = dict(project)
                if project_dict.get('created_at'):
                    project_dict['created_at'] = project_dict['created_at'].isoformat()
                if project_dict.get('updated_at'):
                    project_dict['updated_at'] = project_dict['updated_at'].isoformat()
                projects_list.append(project_dict)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'projects': projects_list}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            cursor.execute('''
                INSERT INTO projects (name, description, color)
                VALUES (%s, %s, %s)
                RETURNING id, name, description, color, created_at, updated_at
            ''', (
                body.get('name'),
                body.get('description'),
                body.get('color')
            ))
            
            project = cursor.fetchone()
            conn.commit()
            
            project_dict = dict(project)
            if project_dict.get('created_at'):
                project_dict['created_at'] = project_dict['created_at'].isoformat()
            if project_dict.get('updated_at'):
                project_dict['updated_at'] = project_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'project': project_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            project_id = body.get('id')
            
            cursor.execute('''
                UPDATE projects 
                SET name = %s, description = %s, color = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, name, description, color, created_at, updated_at
            ''', (
                body.get('name'),
                body.get('description'),
                body.get('color'),
                project_id
            ))
            
            project = cursor.fetchone()
            conn.commit()
            
            if not project:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Project not found'}),
                    'isBase64Encoded': False
                }
            
            project_dict = dict(project)
            if project_dict.get('created_at'):
                project_dict['created_at'] = project_dict['created_at'].isoformat()
            if project_dict.get('updated_at'):
                project_dict['updated_at'] = project_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'project': project_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            project_id = params.get('id')
            
            cursor.execute('DELETE FROM projects WHERE id = %s RETURNING id', (project_id,))
            deleted = cursor.fetchone()
            conn.commit()
            
            if not deleted:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Project not found'}),
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
