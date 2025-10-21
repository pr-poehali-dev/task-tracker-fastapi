import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления задачами с поддержкой CRUD операций
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
                SELECT id, title, description, completed, priority, 
                       tags, category, project, due_date, 
                       created_at, updated_at
                FROM tasks
                ORDER BY created_at DESC
            ''')
            tasks = cursor.fetchall()
            
            tasks_list = []
            for task in tasks:
                task_dict = dict(task)
                if task_dict.get('due_date'):
                    task_dict['due_date'] = task_dict['due_date'].isoformat()
                if task_dict.get('created_at'):
                    task_dict['created_at'] = task_dict['created_at'].isoformat()
                if task_dict.get('updated_at'):
                    task_dict['updated_at'] = task_dict['updated_at'].isoformat()
                tasks_list.append(task_dict)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'tasks': tasks_list}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            cursor.execute('''
                INSERT INTO tasks (title, description, completed, priority, tags, category, project, due_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, title, description, completed, priority, tags, category, project, due_date, created_at, updated_at
            ''', (
                body.get('title'),
                body.get('description'),
                body.get('completed', False),
                body.get('priority', 'medium'),
                body.get('tags', []),
                body.get('category'),
                body.get('project'),
                body.get('due_date')
            ))
            
            task = cursor.fetchone()
            conn.commit()
            
            task_dict = dict(task)
            if task_dict.get('due_date'):
                task_dict['due_date'] = task_dict['due_date'].isoformat()
            if task_dict.get('created_at'):
                task_dict['created_at'] = task_dict['created_at'].isoformat()
            if task_dict.get('updated_at'):
                task_dict['updated_at'] = task_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'task': task_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            task_id = body.get('id')
            
            cursor.execute('''
                UPDATE tasks 
                SET title = %s, description = %s, completed = %s, 
                    priority = %s, tags = %s, category = %s, 
                    project = %s, due_date = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, title, description, completed, priority, tags, category, project, due_date, created_at, updated_at
            ''', (
                body.get('title'),
                body.get('description'),
                body.get('completed'),
                body.get('priority'),
                body.get('tags', []),
                body.get('category'),
                body.get('project'),
                body.get('due_date'),
                task_id
            ))
            
            task = cursor.fetchone()
            conn.commit()
            
            if not task:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Task not found'}),
                    'isBase64Encoded': False
                }
            
            task_dict = dict(task)
            if task_dict.get('due_date'):
                task_dict['due_date'] = task_dict['due_date'].isoformat()
            if task_dict.get('created_at'):
                task_dict['created_at'] = task_dict['created_at'].isoformat()
            if task_dict.get('updated_at'):
                task_dict['updated_at'] = task_dict['updated_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'task': task_dict}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            task_id = params.get('id')
            
            cursor.execute('DELETE FROM tasks WHERE id = %s RETURNING id', (task_id,))
            deleted = cursor.fetchone()
            conn.commit()
            
            if not deleted:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Task not found'}),
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
