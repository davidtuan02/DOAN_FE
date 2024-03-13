import { Component, EventEmitter, forwardRef, Input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { QuillModule, QuillModules } from 'ngx-quill';
import { ContentChange } from 'ngx-quill/lib/quill-editor.component';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule],
  templateUrl: './rich-text-editor.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    }
  ]
})
export class RichTextEditorComponent implements OnInit, ControlValueAccessor {
  @Output() blur = new EventEmitter();

  @Input() editorControl: FormControl;

  quillConfig: QuillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

      ['bold', 'italic', 'underline'],
      [{ 'color': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],

      ['blockquote', 'code-block'],

      [{ 'indent': '-1' }, { 'indent': '+1' }],

      [{ 'align': [] }],

    ]
  };

  content!: string;
  private onTouched!: Function;
  private onChanged!: Function;

  constructor() {
    this.editorControl = new FormControl();
  }

  ngOnInit(): void {
  }

  writeValue(content: string): void {
    this.editorControl.patchValue(content);
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onContentChange(content: ContentChange): void {
    this.onChanged(content.html);
  }

  onFocus(): void {
    this.onTouched();
  }

  onBlur(): void {
    this.blur.emit();
  }

  editorCreated(editor: any): void {
    editor.focus();
  }
}
