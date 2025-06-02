import ijson
import json
import os

def split_json_with_ijson(input_file, max_size_mb=24):
    """
    使用ijson库拆分大型JSON文件
    """
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    output_dir = os.path.dirname(input_file)
    
    file_count = 0
    current_chunk = []
    current_size = 0
    max_size_bytes = max_size_mb * 1024 * 1024
    
    with open(input_file, 'rb') as f:
        objects = ijson.items(f, 'item')
        
        for obj in objects:
            obj_str = json.dumps(obj, ensure_ascii=False)
            obj_size = len(obj_str.encode('utf-8'))
            
            if current_size + obj_size > max_size_bytes and current_chunk:
                file_count += 1
                output_file = os.path.join(output_dir, f"{base_name}_{file_count}.json")
                with open(output_file, 'w', encoding='utf-8') as out_f:
                    json.dump(current_chunk, out_f, ensure_ascii=False, indent=2)
                print(f"已创建: {output_file} (包含 {len(current_chunk)} 个条目)")
                current_chunk = []
                current_size = 0
                
            current_chunk.append(obj)
            current_size += obj_size
        
        # 写入最后一批数据
        if current_chunk:
            file_count += 1
            output_file = os.path.join(output_dir, f"{base_name}_{file_count}.json")
            with open(output_file, 'w', encoding='utf-8') as out_f:
                json.dump(current_chunk, out_f, ensure_ascii=False, indent=2)
            print(f"已创建: {output_file} (包含 {len(current_chunk)} 个条目)")
    
    print(f"\n拆分完成! 共创建 {file_count} 个文件。")

if __name__ == "__main__":
    input_file = input("请输入要拆分的JSON文件路径: ")
    if not os.path.exists(input_file):
        print("错误: 文件不存在!")
    else:
        split_json_with_ijson(input_file)