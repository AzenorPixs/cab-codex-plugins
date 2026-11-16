"""Normalisation JSONC préservant les positions et sans exposer les valeurs."""
import json


def normalize(text):
    chars=list(text);length=len(chars);i=0;inside=False;escaped=False
    while i<length:
        char=chars[i]
        if inside:
            if escaped:escaped=False
            elif char=='\\':escaped=True
            elif char=='"':inside=False
            i+=1;continue
        if char=='"':inside=True;i+=1;continue
        if char=='/' and i+1<length and chars[i+1]=='/':
            chars[i]=chars[i+1]=' ';i+=2
            while i<length and chars[i] not in '\r\n':chars[i]=' ';i+=1
            continue
        if char=='/' and i+1<length and chars[i+1]=='*':
            chars[i]=chars[i+1]=' ';i+=2;closed=False
            while i<length:
                if chars[i]=='*' and i+1<length and chars[i+1]=='/':chars[i]=chars[i+1]=' ';i+=2;closed=True;break
                if chars[i] not in '\r\n':chars[i]=' '
                i+=1
            if not closed:raise ValueError('jsonc-comment-invalid')
            continue
        i+=1
    if inside:raise ValueError('jsonc-string-invalid')
    i=0;inside=False;escaped=False;trailing=set()
    while i<length:
        char=chars[i]
        if inside:
            if escaped:escaped=False
            elif char=='\\':escaped=True
            elif char=='"':inside=False
        elif char=='"':inside=True
        elif char==',':
            j=i+1
            while j<length and chars[j].isspace():j+=1
            if j<length and chars[j] in '}]':chars[i]=' ';trailing.add(i)
        i+=1
    return ''.join(chars),trailing


def unique(pairs):
    value={}
    for key,item in pairs:
        if key in value:raise ValueError('jsonc-duplicate-key')
        value[key]=item
    return value


def loads(text):
    normalized,_=normalize(text)
    return json.loads(normalized,object_pairs_hook=unique)
