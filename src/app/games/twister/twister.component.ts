import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RandomUtils } from 'src/app/shared/utils/random.utils';

@Component({
  selector: 'app-twister',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './twister.component.html',
  styleUrls: ['./twister.component.scss']
})
export class TwisterComponent implements OnInit {

  private limbs: string[] = ['pravá ruka', 'ľavá ruka', 'pravá noha', 'ľavá noha'];
  private colors: string[][] = [['červená', 'red'], ['zelená', 'limegreen'], ['modrá', 'blue'], ['žltá', 'yellow']];

  protected limb: string;
  protected color: string;
  protected backgroundColor: string;

  constructor() { }

  ngOnInit(): void {
    this.spin();
  }

  protected spin(): void {
    this.limb = RandomUtils.from(this.limbs, this.limb);
    [this.color, this.backgroundColor] = RandomUtils.from(this.colors);
  }

}
