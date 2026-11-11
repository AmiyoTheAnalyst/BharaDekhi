with open('scratch/test_capture_file.py', 'r') as f1, open('scratch/capture_studio.py', 'r') as f2:
    print("test_capture_file.py cmd:")
    for line in f1:
        if 'cmd = [' in line or '--' in line:
            print(' ', line.strip())
    print("\ncapture_studio.py cmd:")
    for line in f2:
        if 'cmd = [' in line or '--' in line:
            print(' ', line.strip())
