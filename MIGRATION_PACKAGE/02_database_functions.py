"""
Accessibility Issues Database Functions
========================================
These functions should be integrated into your existing database helper/service layer.
Adapt the connection method to match your existing database setup.

IMPORTANT: Replace the database connection logic with your organization's 
existing database connection pattern (e.g., connection pool, ORM, etc.)
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

# ============================================================================
# CONFIGURATION - ADAPT THIS TO YOUR DATABASE
# ============================================================================
# Replace this with your actual database connection method
# Examples:
# - For SQLAlchemy: from your_app.database import get_db_session
# - For psycopg2: from your_app.database import get_db_connection
# - For MySQL connector: from your_app.database import get_mysql_connection

# EXAMPLE - Replace with your actual connection
def get_db_connection():
    """
    Replace this with your organization's database connection method.
    This is just a placeholder using SQLite.
    """
    import sqlite3
    return sqlite3.connect("your_database.db")


# ============================================================================
# CORE FUNCTIONS
# ============================================================================

def insert_accessibility_issue(
    urlid: str, 
    url: str, 
    issue: str, 
    fix: str, 
    kind_of_change: str = 'add', 
    is_applied: bool = False
) -> str:
    """
    Insert a single accessibility issue into the database.
    
    Args:
        urlid: Unique identifier for the URL test session
        url: The URL being tested
        issue: Description of the accessibility issue
        fix: Suggested fix for the issue
        kind_of_change: Type of change ('add', 'update', 'review')
        is_applied: Whether the fix has been applied
    
    Returns:
        The generated ID for the inserted record
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    issue_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO accessibility_issues 
        (id, urlid, url, issue, fix, is_applied, kind_of_change)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (issue_id, urlid, url, issue, fix, is_applied, kind_of_change))
    
    conn.commit()
    conn.close()
    
    return issue_id


def insert_accessibility_issues_bulk(issues: List[Dict[str, Any]]) -> List[str]:
    """
    Insert multiple accessibility issues in bulk.
    
    Args:
        issues: List of issue dictionaries with keys:
                - urlid, url, issue, fix, kind_of_change, is_applied
    
    Returns:
        List of generated IDs for the inserted records
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    issue_ids = []
    records = []
    
    for issue_data in issues:
        issue_id = str(uuid.uuid4())
        issue_ids.append(issue_id)
        
        records.append((
            issue_id,
            issue_data.get('urlid', ''),
            issue_data.get('url', ''),
            issue_data.get('issue', ''),
            issue_data.get('fix', ''),
            issue_data.get('is_applied', False),
            issue_data.get('kind_of_change', 'add')
        ))
    
    cursor.executemany("""
        INSERT INTO accessibility_issues 
        (id, urlid, url, issue, fix, is_applied, kind_of_change)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, records)
    
    conn.commit()
    conn.close()
    
    return issue_ids


def update_accessibility_issue_status(issue_id: str, is_applied: bool) -> bool:
    """
    Update the is_applied status of an issue.
    
    Args:
        issue_id: The ID of the issue to update
        is_applied: New status value
    
    Returns:
        True if update was successful, False otherwise
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE accessibility_issues 
        SET is_applied = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (is_applied, issue_id))
    
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return rows_affected > 0


def get_accessibility_issues_by_session(urlid: str) -> List[Dict[str, Any]]:
    """
    Retrieve all issues for a specific URL test session.
    
    Args:
        urlid: The URL test session ID
    
    Returns:
        List of issue dictionaries
    """
    conn = get_db_connection()
    # Set row_factory to return dictionaries
    import sqlite3
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM accessibility_issues 
        WHERE urlid = ?
        ORDER BY created_at DESC
    """, (urlid,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_accessibility_issues_by_url(url: str) -> List[Dict[str, Any]]:
    """
    Retrieve all issues for a specific URL.
    
    Args:
        url: The URL being tested
    
    Returns:
        List of issue dictionaries
    """
    conn = get_db_connection()
    import sqlite3
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM accessibility_issues 
        WHERE url = ?
        ORDER BY created_at DESC
    """, (url,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_unapplied_accessibility_issues(urlid: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve all issues that haven't been applied yet.
    
    Args:
        urlid: Optional filter by URL test session ID
    
    Returns:
        List of unapplied issue dictionaries
    """
    conn = get_db_connection()
    import sqlite3
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if urlid:
        cursor.execute("""
            SELECT * FROM accessibility_issues 
            WHERE is_applied = 0 AND urlid = ?
            ORDER BY created_at DESC
        """, (urlid,))
    else:
        cursor.execute("""
            SELECT * FROM accessibility_issues 
            WHERE is_applied = 0
            ORDER BY created_at DESC
        """)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_accessibility_database_stats() -> Dict[str, Any]:
    """
    Get statistics about the accessibility issues in database.
    
    Returns:
        Dictionary with database statistics
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total issues
    cursor.execute("SELECT COUNT(*) FROM accessibility_issues")
    total_issues = cursor.fetchone()[0]
    
    # Applied vs unapplied
    cursor.execute("SELECT COUNT(*) FROM accessibility_issues WHERE is_applied = 1")
    applied_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM accessibility_issues WHERE is_applied = 0")
    unapplied_count = cursor.fetchone()[0]
    
    # By kind of change
    cursor.execute("""
        SELECT kind_of_change, COUNT(*) 
        FROM accessibility_issues 
        GROUP BY kind_of_change
    """)
    by_kind = dict(cursor.fetchall())
    
    # Unique URLs
    cursor.execute("SELECT COUNT(DISTINCT url) FROM accessibility_issues")
    unique_urls = cursor.fetchone()[0]
    
    # Unique URL sessions
    cursor.execute("SELECT COUNT(DISTINCT urlid) FROM accessibility_issues")
    unique_sessions = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        'total_issues': total_issues,
        'applied_issues': applied_count,
        'unapplied_issues': unapplied_count,
        'by_kind_of_change': by_kind,
        'unique_urls': unique_urls,
        'unique_sessions': unique_sessions
    }


def delete_accessibility_issues_by_session(urlid: str) -> int:
    """
    Delete all issues for a specific URL test session.
    
    Args:
        urlid: The URL test session ID
    
    Returns:
        Number of rows deleted
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM accessibility_issues WHERE urlid = ?", (urlid,))
    rows_deleted = cursor.rowcount
    
    conn.commit()
    conn.close()
    
    return rows_deleted


def parse_and_store_accessibility_results(
    api_response: Dict[str, Any], 
    urlid: str, 
    url: str
) -> Dict[str, Any]:
    """
    Parse the accessibility API response and store all issues in the database.
    
    This function should be called after an accessibility test completes.
    
    Args:
        api_response: The full API response JSON with 'results' key
        urlid: Unique identifier for this test session
        url: The URL that was tested
    
    Returns:
        Dictionary with statistics about stored issues
    """
    issues_to_insert = []
    stats = {
        'total_issues': 0,
        'stored_count': 0,
        'categories': {}
    }
    
    # Navigate through the API response structure
    if 'results' in api_response:
        results = api_response['results']
        
        # Process each category of checks
        for category, checks in results.items():
            if not isinstance(checks, dict):
                continue
            
            category_count = 0
            
            for check_name, check_data in checks.items():
                if not isinstance(check_data, dict):
                    continue
                
                # Handle different response structures
                issues_list = []
                
                # Check for 'issues' key
                if 'issues' in check_data and isinstance(check_data['issues'], list):
                    issues_list = check_data['issues']
                
                # Check for 'violations' key
                elif 'violations' in check_data and isinstance(check_data['violations'], list):
                    issues_list = check_data['violations']
                
                # Check for direct issue data
                elif 'issue' in check_data:
                    issues_list = [check_data]
                
                # Process each issue
                for issue_item in issues_list:
                    if isinstance(issue_item, dict):
                        # Extract issue and fix information
                        issue_text = (
                            issue_item.get('issue', '') or 
                            issue_item.get('description', '') or 
                            issue_item.get('message', '')
                        )
                        fix_text = (
                            issue_item.get('fix', '') or 
                            issue_item.get('recommendation', '') or 
                            issue_item.get('how_to_fix', '')
                        )
                        
                        # Determine kind of change based on severity or type
                        kind = 'review'
                        if 'severity' in issue_item:
                            severity = issue_item['severity'].lower()
                            if severity in ['critical', 'serious', 'high']:
                                kind = 'add'
                            elif severity in ['moderate', 'medium']:
                                kind = 'update'
                        
                        if issue_text and fix_text:
                            issues_to_insert.append({
                                'urlid': urlid,
                                'url': url,
                                'issue': f"[{category} - {check_name}] {issue_text}",
                                'fix': fix_text,
                                'kind_of_change': kind,
                                'is_applied': False
                            })
                            category_count += 1
            
            if category_count > 0:
                stats['categories'][category] = category_count
    
    # Insert all issues in bulk
    if issues_to_insert:
        inserted_ids = insert_accessibility_issues_bulk(issues_to_insert)
        stats['stored_count'] = len(inserted_ids)
        stats['total_issues'] = len(issues_to_insert)
    
    return stats


# ============================================================================
# NOTES FOR INTEGRATION:
# ============================================================================
# 1. Replace get_db_connection() with your actual database connection method
# 2. Adjust SQL syntax if using PostgreSQL, MySQL, etc. (not SQLite)
# 3. Consider using your existing ORM (SQLAlchemy, Django ORM, etc.)
# 4. Add proper error handling and logging
# 5. Add transaction management if needed
# 6. Consider connection pooling for production
# ============================================================================

